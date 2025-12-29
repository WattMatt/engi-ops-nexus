import { supabase } from '@/integrations/supabase/client';

/**
 * Automatically syncs floor plan takeoff quantities to final account items
 * based on existing material mappings. Called after floor plan save.
 * 
 * The sync works by:
 * 1. Calculating current quantities from the floor plan (equipment, containment, cables)
 * 2. Looking up which final_account_items are mapped via floor_plan_material_mappings
 * 3. Updating the final_account_items with the new quantities directly (replacing floor plan contribution)
 * 4. Tracking contributions in floor_plan_quantity_contributions for delta calculations
 */
export const autoSyncToFinalAccount = async (floorPlanId: string): Promise<{ synced: boolean; itemsUpdated: number }> => {
  try {
    console.log('[AutoSync] Starting sync for floor plan:', floorPlanId);
    
    // Get floor plan project info
    const { data: floorPlan } = await supabase
      .from('floor_plan_projects')
      .select('project_id, linked_section_id, linked_shop_subsection_id')
      .eq('id', floorPlanId)
      .single();

    if (!floorPlan?.project_id) {
      console.log('[AutoSync] No project linked to floor plan');
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
      console.log('[AutoSync] No mappings found for floor plan');
      return { synced: false, itemsUpdated: 0 };
    }

    console.log('[AutoSync] Found', mappings.length, 'mappings');

    // Get current takeoff counts from the floor plan
    const counts = await calculateTakeoffCounts(floorPlanId);
    console.log('[AutoSync] Takeoff counts:', counts);

    // Build a map of equipment_label -> total quantity from floor plan
    const floorPlanQuantities = new Map<string, number>();
    
    // Equipment counts
    for (const [label, count] of Object.entries(counts.equipment)) {
      floorPlanQuantities.set(`equipment_${label}`, count);
    }
    
    // Containment lengths
    for (const [label, length] of Object.entries(counts.containment)) {
      floorPlanQuantities.set(`containment_${label}`, Math.round(length * 100) / 100);
    }
    
    // Cable lengths
    for (const [cableType, data] of Object.entries(counts.cables)) {
      floorPlanQuantities.set(`cable_${cableType}`, Math.round(data.totalLength * 100) / 100);
    }

    console.log('[AutoSync] Floor plan quantities:', Object.fromEntries(floorPlanQuantities));

    // Group mappings by final_account_item_id, sum up quantity_per_unit for each equipment_label
    const itemMappings = new Map<string, { labels: string[]; quantityPerUnit: number }>();
    
    for (const m of mappings) {
      if (m.final_account_item_id) {
        const key = `${m.equipment_type}_${m.equipment_label}`;
        if (!itemMappings.has(m.final_account_item_id)) {
          itemMappings.set(m.final_account_item_id, { labels: [], quantityPerUnit: 1 });
        }
        const existing = itemMappings.get(m.final_account_item_id)!;
        if (!existing.labels.includes(key)) {
          existing.labels.push(key);
        }
        // Use quantity_per_unit if specified
        if (m.quantity_per_unit && m.quantity_per_unit !== 1) {
          existing.quantityPerUnit = m.quantity_per_unit;
        }
      }
    }

    console.log('[AutoSync] Item mappings:', Object.fromEntries(itemMappings));

    // Get previous contributions for this floor plan
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

    console.log('[AutoSync] Previous contributions:', Object.fromEntries(previousContributions));

    let itemsUpdated = 0;
    const allAffectedItemIds = new Set<string>();

    // Calculate new quantities for each mapped final_account_item
    for (const [itemId, mapping] of itemMappings) {
      allAffectedItemIds.add(itemId);
      
      // Sum quantities from all labels mapped to this item
      let newQtyFromFloorPlan = 0;
      for (const label of mapping.labels) {
        const labelQty = floorPlanQuantities.get(label) || 0;
        newQtyFromFloorPlan += labelQty * mapping.quantityPerUnit;
      }

      const previousQty = previousContributions.get(itemId) || 0;
      const qtyDelta = newQtyFromFloorPlan - previousQty;

      console.log(`[AutoSync] Item ${itemId}: labels=${mapping.labels.join(',')}, newQty=${newQtyFromFloorPlan}, prevQty=${previousQty}, delta=${qtyDelta}`);

      // Get current final_account_item
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

        console.log(`[AutoSync] Updating item ${itemId}: finalQty ${currentFinalQty} -> ${newFinalQty}`);

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
    }

    // Handle items that were previously contributed but are no longer in mappings
    for (const [itemId, previousQty] of previousContributions) {
      if (!allAffectedItemIds.has(itemId)) {
        console.log(`[AutoSync] Removing previous contribution for unmapped item ${itemId}: ${previousQty}`);
        
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

    console.log('[AutoSync] Completed. Items updated:', itemsUpdated);
    return { synced: true, itemsUpdated };
  } catch (error) {
    console.error('[AutoSync] Failed:', error);
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
