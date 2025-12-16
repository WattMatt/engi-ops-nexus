import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Star,
  Building2,
  Mail,
  Phone,
  Globe,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  categories: string[] | null;
  is_preferred: boolean | null;
  notes: string | null;
  created_at: string;
}

export const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    categories: '',
    is_preferred: false,
    notes: ''
  });

  // Load suppliers
  useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lighting_suppliers')
        .select('*')
        .order('is_preferred', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error loading suppliers:', error);
        toast.error('Failed to load suppliers');
      } else {
        setSuppliers(data || []);
      }
      setIsLoading(false);
    };

    loadSuppliers();
  }, []);

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.categories?.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Open dialog for new supplier
  const handleAddNew = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      categories: '',
      is_preferred: false,
      notes: ''
    });
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      website: supplier.website || '',
      categories: supplier.categories?.join(', ') || '',
      is_preferred: supplier.is_preferred || false,
      notes: supplier.notes || ''
    });
    setIsDialogOpen(true);
  };

  // Save supplier
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      const supplierData = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        website: formData.website.trim() || null,
        categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
        is_preferred: formData.is_preferred,
        notes: formData.notes.trim() || null
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from('lighting_suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id);

        if (error) throw error;

        setSuppliers(prev => prev.map(s => 
          s.id === editingSupplier.id ? { ...s, ...supplierData } : s
        ));
        toast.success('Supplier updated');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from('lighting_suppliers')
          .insert({ ...supplierData, created_by: user?.id })
          .select()
          .single();

        if (error) throw error;

        setSuppliers(prev => [...prev, data]);
        toast.success('Supplier added');
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  // Delete supplier
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      const { error } = await supabase
        .from('lighting_suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.success('Supplier deleted');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  // Toggle preferred status
  const handleTogglePreferred = async (supplier: Supplier) => {
    try {
      const { error } = await supabase
        .from('lighting_suppliers')
        .update({ is_preferred: !supplier.is_preferred })
        .eq('id', supplier.id);

      if (error) throw error;

      setSuppliers(prev => prev.map(s => 
        s.id === supplier.id ? { ...s, is_preferred: !s.is_preferred } : s
      ));
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Failed to update supplier');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Supplier Management
          </CardTitle>
          <Button onClick={handleAddNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Supplier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Suppliers Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead className="text-center">Preferred</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading suppliers...' : 'No suppliers found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map(supplier => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {supplier.is_preferred && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.website && (
                            <a 
                              href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {supplier.contact_person && (
                          <div>{supplier.contact_person}</div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories?.slice(0, 3).map((cat, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {(supplier.categories?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{supplier.categories!.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePreferred(supplier)}
                      >
                        <Star className={`h-4 w-4 ${supplier.is_preferred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{suppliers.length} total suppliers</span>
          <span>{suppliers.filter(s => s.is_preferred).length} preferred</span>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter supplier name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+27 ..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="www.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Categories (comma-separated)</Label>
              <Input
                value={formData.categories}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                placeholder="LED, Commercial, Emergency"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Preferred Supplier</Label>
              <Switch
                checked={formData.is_preferred}
                onCheckedChange={(checked) => setFormData({ ...formData, is_preferred: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingSupplier ? 'Update' : 'Add'} Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SupplierManagement;
