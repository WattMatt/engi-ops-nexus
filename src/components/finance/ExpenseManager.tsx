import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, TrendingDown, Calendar } from "lucide-react";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_payroll: boolean;
  display_order: number;
}

interface MonthlyExpense {
  id: string;
  category_id: string;
  expense_month: string;
  budgeted_amount: number;
  actual_amount: number | null;
  notes: string | null;
  is_recurring: boolean;
  expense_categories?: ExpenseCategory;
}

export function ExpenseManager() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [budgetedAmount, setBudgetedAmount] = useState<string>("");
  const [actualAmount, setActualAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["monthly-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_expenses")
        .select(`
          *,
          expense_categories (*)
        `)
        .order("expense_month", { ascending: false });
      if (error) throw error;
      return data as MonthlyExpense[];
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: {
      category_id: string;
      expense_month: string;
      budgeted_amount: number;
      actual_amount: number | null;
      notes: string | null;
      is_recurring: boolean;
    }) => {
      const { error } = await supabase.from("monthly_expenses").upsert(expense, {
        onConflict: "category_id,expense_month",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-expenses"] });
      toast.success("Expense saved successfully");
      resetForm();
      setIsAddDialogOpen(false);
      setEditingExpense(null);
    },
    onError: (error) => {
      toast.error("Failed to save expense: " + error.message);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monthly_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-expenses"] });
      toast.success("Expense deleted");
    },
  });

  const generateRecurringExpenses = useMutation({
    mutationFn: async () => {
      const recurringExpenses = expenses.filter((e) => e.is_recurring);
      const today = new Date();
      const futureMonths = Array.from({ length: 12 }, (_, i) =>
        format(addMonths(startOfMonth(today), i + 1), "yyyy-MM-01")
      );

      const newExpenses = [];
      for (const expense of recurringExpenses) {
        for (const month of futureMonths) {
          const exists = expenses.some(
            (e) => e.category_id === expense.category_id && e.expense_month === month
          );
          if (!exists) {
            newExpenses.push({
              category_id: expense.category_id,
              expense_month: month,
              budgeted_amount: expense.budgeted_amount,
              is_recurring: true,
              notes: "Auto-generated from recurring expense",
            });
          }
        }
      }

      if (newExpenses.length > 0) {
        const { error } = await supabase.from("monthly_expenses").insert(newExpenses);
        if (error) throw error;
      }
      return newExpenses.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-expenses"] });
      toast.success(`Generated ${count} recurring expense entries`);
    },
  });

  const resetForm = () => {
    setSelectedCategory("");
    setSelectedMonth(format(new Date(), "yyyy-MM"));
    setBudgetedAmount("");
    setActualAmount("");
    setNotes("");
    setIsRecurring(false);
  };

  const handleEdit = (expense: MonthlyExpense) => {
    setEditingExpense(expense);
    setSelectedCategory(expense.category_id);
    setSelectedMonth(expense.expense_month.substring(0, 7));
    setBudgetedAmount(expense.budgeted_amount.toString());
    setActualAmount(expense.actual_amount?.toString() || "");
    setNotes(expense.notes || "");
    setIsRecurring(expense.is_recurring);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedCategory || !budgetedAmount) {
      toast.error("Please fill in required fields");
      return;
    }

    addExpenseMutation.mutate({
      category_id: selectedCategory,
      expense_month: selectedMonth + "-01",
      budgeted_amount: parseFloat(budgetedAmount),
      actual_amount: actualAmount ? parseFloat(actualAmount) : null,
      notes: notes || null,
      is_recurring: isRecurring,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  // Group expenses by month
  const expensesByMonth = expenses.reduce((acc, expense) => {
    const month = expense.expense_month.substring(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(expense);
    return acc;
  }, {} as Record<string, MonthlyExpense[]>);

  // Calculate totals
  const totalBudgeted = expenses.reduce((sum, e) => sum + e.budgeted_amount, 0);
  const totalActual = expenses.reduce((sum, e) => sum + (e.actual_amount || 0), 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(new Date(), i - 6);
    return format(date, "yyyy-MM");
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Budgeted (All Time)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actual (All Time)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Variance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalActual > totalBudgeted ? "text-destructive" : "text-green-600"}`}>
              {formatCurrency(totalBudgeted - totalActual)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingExpense(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
              <DialogDescription>
                Enter budgeted and actual amounts for expense tracking
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month *</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {format(parseISO(month + "-01"), "MMMM yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budgeted Amount *</Label>
                  <Input
                    type="number"
                    value={budgetedAmount}
                    onChange={(e) => setBudgetedAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual Amount</Label>
                  <Input
                    type="number"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="recurring">Recurring expense (auto-generate for future months)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
                setEditingExpense(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={addExpenseMutation.isPending}>
                {addExpenseMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          onClick={() => generateRecurringExpenses.mutate()}
          disabled={generateRecurringExpenses.isPending}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Generate Recurring
        </Button>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expenses</CardTitle>
          <CardDescription>Budget vs actual expenses by category and month</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="category">By Category</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading expenses...
                      </TableCell>
                    </TableRow>
                  ) : expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No expenses recorded. Add your first expense to start tracking.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.slice(0, 50).map((expense) => {
                      const variance = expense.budgeted_amount - (expense.actual_amount || 0);
                      const isOverBudget = expense.actual_amount && expense.actual_amount > expense.budgeted_amount;
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {format(parseISO(expense.expense_month), "MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {expense.expense_categories?.name}
                              {expense.is_recurring && (
                                <Badge variant="outline" className="text-xs">Recurring</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(expense.budgeted_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {expense.actual_amount ? formatCurrency(expense.actual_amount) : "-"}
                          </TableCell>
                          <TableCell className={`text-right ${isOverBudget ? "text-destructive" : "text-green-600"}`}>
                            {expense.actual_amount ? formatCurrency(variance) : "-"}
                          </TableCell>
                          <TableCell>
                            {expense.actual_amount ? (
                              <Badge variant={isOverBudget ? "destructive" : "secondary"}>
                                {isOverBudget ? "Over Budget" : "On Track"}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Forecast</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(expense)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteExpenseMutation.mutate(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="category">
              <div className="space-y-4">
                {categories.map((category) => {
                  const categoryExpenses = expenses.filter((e) => e.category_id === category.id);
                  const totalBudget = categoryExpenses.reduce((sum, e) => sum + e.budgeted_amount, 0);
                  const totalActual = categoryExpenses.reduce((sum, e) => sum + (e.actual_amount || 0), 0);
                  
                  if (categoryExpenses.length === 0) return null;
                  
                  return (
                    <Card key={category.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          <div className="flex gap-4 text-sm">
                            <span>Budget: {formatCurrency(totalBudget)}</span>
                            <span>Actual: {formatCurrency(totalActual)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${totalActual > totalBudget ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${Math.min((totalActual / totalBudget) * 100, 100)}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
