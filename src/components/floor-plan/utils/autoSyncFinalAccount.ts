import { supabase } from '@/integrations/supabase/client';

/**
 * Automatically syncs floor plan takeoff quantities to final account items
 * based on existing material mappings. Called after floor plan save.
 */
export const autoSyncToFinalAccount = async (floorPlanId: string): Promise<{ synced: boolean; itemsUpdated: number }> => {
  try {
    // Get floor plan project info
    const { data: floorPlan } = await supabase
      .from('floor_plan_projects')
      .select('project_id, linked_section_id, linked_shop_subsection_id')
      .eq('id', floorPlanId)
      .single();

    if (!floorPlan?.project_id) {
      return { synced: false, itemsUpdated: 0 };
    }

    const projectId = floorPlan.project_id;

    // Check if there are any mappings for this floor plan
    const { data: mappings } = await supabase
      .from('floor_plan_material_mappings')
      .select('*')
      .eq('floor_plan_id', floorPlanId)
      .eq('project_id', projectId);

    if (!mappings || mappings.length === 0) {
      return { synced: false, itemsUpdated: 0 };
    }

    // Get current takeoff counts from the floor plan
    const counts = await calculateTakeoffCounts(floorPlanId);

    // Build mapping lookup: equipment_label -> array of finalAccountItemIds
    const mappingsByEquipment = new Map<string, string[]>();
    for (const m of mappings) {
      if (m.final_account_item_id) {
        const key = `${m.equipment_type}_${m.equipment_label}`;
        const existing = mappingsByEquipment.get(key) || [];
        if (!existing.includes(m.final_account_item_id)) {
          existing.push(m.final_account_item_id);
        }
        mappingsByEquipment.set(key, existing);
      }
    }

    // Get previous contributions
    const { data: existingContributions } = await (supabase as any)
      .from('floor_plan_quantity_contributions')
      .select('*')
      .eq('floor_plan_id', floorPlanId);

    const previousContributions = new Map<string, number>();
    if (existingContributions) {
      for (const c of existingContributions as any[]) {
        previousContributions.set(c.final_account_item_id, Number(c.quantity_contributed) || 0);
      }
    }

    // Calculate new quantities for mapped items
    const mappedItemQuantities = new Map<string, number>();

    // Process equipment
    for (const [equipType, count] of Object.entries(counts.equipment)) {
      if (count <= 0) continue;
      const key = `equipment_${equipType}`;
      const mappedItemIds = mappingsByEquipment.get(key);
      if (mappedItemIds && mappedItemIds.length > 0) {
        for (const itemId of mappedItemIds) {
          const current = mappedItemQuantities.get(itemId) || 0;
          mappedItemQuantities.set(itemId, current + count);
        }
      }
    }

    // Process containment
    for (const [containType, length] of Object.entries(counts.containment)) {
      if (length <= 0) continue;
      const key = `containment_${containType}`;
      const mappedItemIds = mappingsByEquipment.get(key);
      const qty = Math.round(length * 100) / 100;
      if (mappedItemIds && mappedItemIds.length > 0) {
        for (const itemId of mappedItemIds) {
          const current = mappedItemQuantities.get(itemId) || 0;
          mappedItemQuantities.set(itemId, current + qty);
        }
      }
    }

    // Process cables
    for (const [cableType, data] of Object.entries(counts.cables)) {
      if (data.count <= 0) continue;
      const key = `cable_${cableType}`;
      const mappedItemIds = mappingsByEquipment.get(key);
      const qty = Math.round(data.totalLength * 100) / 100;
      if (mappedItemIds && mappedItemIds.length > 0) {
        for (const itemId of mappedItemIds) {
          const current = mappedItemQuantities.get(itemId) || 0;
          mappedItemQuantities.set(itemId, current + qty);
        }
      }
    }

    let itemsUpdated = 0;

    // Update mapped BOQ items - calculate delta from previous contribution
    for (const [itemId, newQtyFromFloorPlan] of mappedItemQuantities) {
      const previousQty = previousContributions.get(itemId) || 0;
      const qtyDelta = newQtyFromFloorPlan - previousQty;

      const { data: existing } = await supabase
        .from('final_account_items')
        .select('final_quantity, supply_rate, install_rate, contract_quantity')
        .eq('id', itemId)
        .single();

      if (existing) {
        const currentFinalQty = existing.final_quantity ?? 0;
        const newFinalQty = Math.max(0, currentFinalQty + qtyDelta);
        const supplyRate = existing.supply_rate || 0;
        const installRate = existing.install_rate || 0;
        const contractQty = existing.contract_quantity || 0;

        const finalAmount = newFinalQty * (supplyRate + installRate);
        const contractAmount = contractQty * (supplyRate + installRate);
        const variationAmount = finalAmount - contractAmount;

        await supabase
          .from('final_account_items')
          .update({
            final_quantity: newFinalQty,
            final_amount: finalAmount,
            contract_amount: contractAmount,
            variation_amount: variationAmount
          })
          .eq('id', itemId);

        itemsUpdated++;
      }

      // Upsert contribution record
      await (supabase as any)
        .from('floor_plan_quantity_contributions')
        .upsert({
          floor_plan_id: floorPlanId,
          final_account_item_id: itemId,
          quantity_contributed: newQtyFromFloorPlan,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'floor_plan_id,final_account_item_id' });
    }

    // Handle items that were previously contributed but are no longer mapped
    for (const [itemId, previousQty] of previousContributions) {
      if (!mappedItemQuantities.has(itemId)) {
        const { data: existing } = await supabase
          .from('final_account_items')
          .select('final_quantity, supply_rate, install_rate, contract_quantity')
          .eq('id', itemId)
          .single();

        if (existing) {
          const currentFinalQty = existing.final_quantity ?? 0;
          const newFinalQty = Math.max(0, currentFinalQty - previousQty);
          const supplyRate = existing.supply_rate || 0;
          const installRate = existing.install_rate || 0;
          const contractQty = existing.contract_quantity || 0;

          const finalAmount = newFinalQty * (supplyRate + installRate);
          const contractAmount = contractQty * (supplyRate + installRate);
          const variationAmount = finalAmount - contractAmount;

          await supabase
            .from('final_account_items')
            .update({
              final_quantity: newFinalQty,
              final_amount: finalAmount,
              contract_amount: contractAmount,
              variation_amount: variationAmount
            })
            .eq('id', itemId);

          itemsUpdated++;
        }

        // Remove contribution record
        await (supabase as any)
          .from('floor_plan_quantity_contributions')
          .delete()
          .eq('floor_plan_id', floorPlanId)
          .eq('final_account_item_id', itemId);
      }
    }

    return { synced: true, itemsUpdated };
  } catch (error) {
    console.error('Auto-sync to final account failed:', error);
    return { synced: false, itemsUpdated: 0 };
  }
};

/**
 * Calculate takeoff counts from saved floor plan data
 */
async function calculateTakeoffCounts(floorPlanId: string) {
  const counts = {
    equipment: {} as Record<string, number>,
    containment: {} as Record<string, number>,
    cables: {} as Record<string, { count: number; totalLength: number }>
  };

  // Get equipment counts
  const { data: equipment } = await supabase
    .from('floor_plan_equipment')
    .select('type, label')
    .eq('floor_plan_id', floorPlanId);

  if (equipment) {
    for (const eq of equipment) {
      const label = eq.label || eq.type || 'Unknown';
      counts.equipment[label] = (counts.equipment[label] || 0) + 1;
    }
  }

  // Get containment lengths
  const { data: containment } = await supabase
    .from('floor_plan_containment')
    .select('type, size, length_meters')
    .eq('floor_plan_id', floorPlanId);

  if (containment) {
    for (const c of containment) {
      const label = c.size ? `${c.size} ${c.type}` : c.type;
      counts.containment[label] = (counts.containment[label] || 0) + (c.length_meters || 0);
    }
  }

  // Get cable lengths
  const { data: cables } = await supabase
    .from('floor_plan_cables')
    .select('cable_type, length_meters')
    .eq('floor_plan_id', floorPlanId);

  if (cables) {
    for (const cable of cables) {
      const type = cable.cable_type || 'Unknown';
      if (!counts.cables[type]) {
        counts.cables[type] = { count: 0, totalLength: 0 };
      }
      counts.cables[type].count += 1;
      counts.cables[type].totalLength += cable.length_meters || 0;
    }
  }

  return counts;
}
