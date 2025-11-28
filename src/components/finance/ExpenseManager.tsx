import { useState, useRef } from "react";
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
import { Plus, Edit2, Trash2, Calendar, Users, RefreshCw, Upload, FileSpreadsheet } from "lucide-react";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from "xlsx";

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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [isImportingFile, setIsImportingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch active payroll data
  const { data: payrollData } = useQuery({
    queryKey: ["payroll-for-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_records")
        .select(`
          id, salary_amount, salary_currency, payment_frequency, effective_date, end_date,
          employees!payroll_records_employee_id_fkey (first_name, last_name, employment_status)
        `)
        .or("end_date.is.null,end_date.gt.now()");
      if (error) throw error;
      return data;
    },
  });

  // Calculate total monthly payroll
  const calculateMonthlyPayroll = () => {
    if (!payrollData) return 0;
    return payrollData.reduce((sum, record: any) => {
      let monthlyAmount = record.salary_amount;
      if (record.payment_frequency === "weekly") {
        monthlyAmount = record.salary_amount * 4.33;
      } else if (record.payment_frequency === "biweekly") {
        monthlyAmount = record.salary_amount * 2.17;
      } else if (record.payment_frequency === "annual") {
        monthlyAmount = record.salary_amount / 12;
      }
      return sum + monthlyAmount;
    }, 0);
  };

  const monthlyPayroll = calculateMonthlyPayroll();
  const activeEmployeeCount = payrollData?.length || 0;

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

  // Import expenses from XLSX file
  const importXlsxMutation = useMutation({
    mutationFn: async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

      if (jsonData.length < 2) throw new Error("Not enough data in spreadsheet");

      // Find header row with month columns - search first 10 rows
      let headerRowIndex = -1;
      const monthColumns: { index: number; month: string }[] = [];
      
      for (let rowIdx = 0; rowIdx < Math.min(10, jsonData.length); rowIdx++) {
        const row = jsonData[rowIdx];
        if (!row) continue;
        
        const tempMonthCols: { index: number; month: string }[] = [];
        
        row.forEach((cell: any, idx: number) => {
          if (!cell) return;
          const cellStr = String(cell).trim();
          // Match formats: Aug-25, Aug 25, Aug25, August 2025, 2025-08
          const match = cellStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]?(\d{2})$/i);
          if (match) {
            const monthAbbr = match[1].charAt(0).toUpperCase() + match[1].slice(1, 3).toLowerCase();
            tempMonthCols.push({ index: idx, month: `${monthAbbr}-${match[2]}` });
          }
        });
        
        // Use the row with the most month columns found
        if (tempMonthCols.length > monthColumns.length) {
          monthColumns.length = 0;
          monthColumns.push(...tempMonthCols);
          headerRowIndex = rowIdx;
        }
      }

      console.log("Found month columns:", monthColumns, "in row:", headerRowIndex);
      console.log("First few rows:", jsonData.slice(0, 3));

      if (monthColumns.length === 0) {
        throw new Error("No month columns found. Expected format: 'Aug-25', 'Sep-25', etc.");
      }

      const monthMap: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };

      // Get existing categories
      const { data: existingCategories } = await supabase.from('expense_categories').select('*');
      const categoryMap = new Map<string, string>();
      existingCategories?.forEach(cat => categoryMap.set(cat.name.toLowerCase(), cat.id));

      const expensesToInsert: { categoryId: string; month: string; amount: number }[] = [];
      let newCategoryOrder = (existingCategories?.length || 0) + 1;

      // Process data rows (start after header row)
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const expenseName = String(row[0] || '').trim();
        if (!expenseName || expenseName.match(/^\d/) || expenseName.toUpperCase() === 'EXPENSE:') continue;

        // Skip subtotal/total rows and empty-looking rows
        if (expenseName.toLowerCase().includes('total')) continue;

        // Get or create category
        let categoryId = categoryMap.get(expenseName.toLowerCase());
        
        if (!categoryId) {
          const code = expenseName.substring(0, 15).toUpperCase().replace(/[^A-Z0-9]/g, '_');
          const { data: newCat, error } = await supabase
            .from('expense_categories')
            .insert({ 
              name: expenseName, 
              code, 
              display_order: newCategoryOrder++,
              is_payroll: expenseName.toLowerCase().includes('salary') || 
                         expenseName.toLowerCase().includes('paye') ||
                         expenseName.toLowerCase().includes('director')
            })
            .select()
            .single();
          
          if (error) {
            console.error(`Failed to create category ${expenseName}:`, error);
            continue;
          }
          categoryId = newCat.id;
          categoryMap.set(expenseName.toLowerCase(), categoryId);
        }

        // Get amounts for each month
        monthColumns.forEach(({ index, month }) => {
          const cellValue = row[index];
          if (cellValue === undefined || cellValue === null || cellValue === '') return;

          let amount: number;
          if (typeof cellValue === 'number') {
            amount = cellValue;
          } else {
            const cleaned = String(cellValue).replace(/[R\s,]/g, '');
            amount = parseFloat(cleaned);
          }

          if (isNaN(amount) || amount === 0) return;

          const [monthAbbr, yearShort] = month.split('-');
          const monthKey = `20${yearShort}-${monthMap[monthAbbr]}-01`;

          expensesToInsert.push({ categoryId, month: monthKey, amount });
        });
      }

      // Aggregate by category and month
      const aggregated = new Map<string, number>();
      expensesToInsert.forEach(({ categoryId, month, amount }) => {
        const key = `${categoryId}|${month}`;
        aggregated.set(key, (aggregated.get(key) || 0) + amount);
      });

      // Insert/upsert expenses
      let insertCount = 0;
      for (const [key, amount] of aggregated) {
        const [categoryId, month] = key.split('|');
        const { error } = await supabase
          .from('monthly_expenses')
          .upsert({
            category_id: categoryId,
            expense_month: month,
            budgeted_amount: amount,
            actual_amount: amount,
            is_recurring: false,
            notes: 'Imported from XLSX'
          }, {
            onConflict: 'category_id,expense_month'
          });
        
        if (!error) insertCount++;
      }

      return { 
        categories: categoryMap.size, 
        months: monthColumns.length, 
        entries: insertCount 
      };
    },
    onSuccess: ({ categories, months, entries }) => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-expenses"] });
      toast.success(`Imported ${entries} expense entries across ${months} months (${categories} categories)`);
      setIsImportDialogOpen(false);
      setIsImportingFile(false);
    },
    onError: (error) => {
      toast.error("XLSX import failed: " + error.message);
      setIsImportingFile(false);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    
    setIsImportingFile(true);
    importXlsxMutation.mutate(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import expenses from spreadsheet (text paste)
  const importExpensesMutation = useMutation({
    mutationFn: async (data: string) => {
      const lines = data.trim().split('\n');
      if (lines.length < 2) throw new Error("Not enough data to import");

      const headerLine = lines[0];
      const headers = headerLine.split('\t');
      
      // Find month columns (format: Aug-25, Sep-25, etc.)
      const monthColumns: { index: number; month: string }[] = [];
      headers.forEach((header, idx) => {
        const match = header.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/);
        if (match) {
          monthColumns.push({ index: idx, month: header });
        }
      });

      if (monthColumns.length === 0) {
        throw new Error("No month columns found in format 'MMM-YY'");
      }

      // Get or create Salaries & Wages category
      let { data: salaryCategory } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('name', 'Salaries & Wages')
        .single();

      if (!salaryCategory) {
        const { data: newCat, error } = await supabase
          .from('expense_categories')
          .insert({ name: 'Salaries & Wages', code: 'SALARY', display_order: 1 })
          .select()
          .single();
        if (error) throw error;
        salaryCategory = newCat;
      }

      const categoryMap = new Map<string, string>();
      const expensesByMonth = new Map<string, { categoryId: string; amount: number }[]>();

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cells = line.split('\t');
        const expenseName = cells[0]?.trim();
        if (!expenseName) continue;

        // Determine category
        const isSalary = expenseName.toLowerCase().includes('salary') || 
                        expenseName.toLowerCase().includes('paye') ||
                        expenseName.toLowerCase().includes('director');
        
        let categoryId: string;
        
        if (isSalary) {
          categoryId = salaryCategory.id;
        } else {
          if (!categoryMap.has(expenseName)) {
            const { data: existingCat } = await supabase
              .from('expense_categories')
              .select('id')
              .eq('name', expenseName)
              .single();

            if (existingCat) {
              categoryId = existingCat.id;
            } else {
              const { data: newCat } = await supabase
                .from('expense_categories')
                .insert({ 
                  name: expenseName, 
                  code: expenseName.substring(0, 10).toUpperCase().replace(/\s+/g, '_'),
                  display_order: i
                })
                .select()
                .single();
              categoryId = newCat!.id;
            }
            categoryMap.set(expenseName, categoryId);
          } else {
            categoryId = categoryMap.get(expenseName)!;
          }
        }

        // Parse amounts for each month
        monthColumns.forEach(({ index, month }) => {
          const amountStr = cells[index]?.trim();
          if (!amountStr) return;

          const amount = parseFloat(amountStr.replace(/[R\s,]/g, ''));
          if (isNaN(amount) || amount === 0) return;

          // Convert "Aug-25" to "2025-08-01"
          const [monthAbbr, yearShort] = month.split('-');
          const monthMap: Record<string, string> = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const monthKey = `20${yearShort}-${monthMap[monthAbbr]}-01`;

          if (!expensesByMonth.has(monthKey)) {
            expensesByMonth.set(monthKey, []);
          }
          expensesByMonth.get(monthKey)!.push({ categoryId, amount });
        });
      }

      // Insert/update expenses
      let insertCount = 0;
      for (const [month, expenses] of expensesByMonth) {
        const categoryTotals = new Map<string, number>();
        expenses.forEach(({ categoryId, amount }) => {
          categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + amount);
        });

        for (const [categoryId, amount] of categoryTotals) {
          await supabase
            .from('monthly_expenses')
            .upsert({
              category_id: categoryId,
              expense_month: month,
              budgeted_amount: amount,
              actual_amount: amount,
              is_recurring: true,
              notes: 'Imported from spreadsheet'
            }, {
              onConflict: 'category_id,expense_month'
            });
          insertCount++;
        }
      }

      return { months: expensesByMonth.size, entries: insertCount };
    },
    onSuccess: ({ months, entries }) => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-expenses"] });
      toast.success(`Imported ${entries} expense entries across ${months} months`);
      setIsImportDialogOpen(false);
      setImportData("");
    },
    onError: (error) => {
      toast.error("Import failed: " + error.message);
    },
  });

  // Sync payroll to expenses
  const syncPayrollMutation = useMutation({
    mutationFn: async () => {
      // Find salary category
      const salaryCategory = categories.find((c) => c.code === "SALARY");
      if (!salaryCategory) throw new Error("Salary category not found");

      const today = new Date();
      const months = Array.from({ length: 12 }, (_, i) =>
        format(addMonths(startOfMonth(today), i), "yyyy-MM-01")
      );

      let created = 0;
      let updated = 0;

      for (const month of months) {
        const existingExpense = expenses.find(
          (e) => e.category_id === salaryCategory.id && e.expense_month === month
        );

        if (existingExpense) {
          // Update if budget differs
          if (existingExpense.budgeted_amount !== monthlyPayroll) {
            const { error } = await supabase
              .from("monthly_expenses")
              .update({ budgeted_amount: monthlyPayroll, notes: `Synced from payroll: ${activeEmployeeCount} employees` })
              .eq("id", existingExpense.id);
            if (error) throw error;
            updated++;
          }
        } else {
          // Create new entry
          const { error } = await supabase.from("monthly_expenses").insert({
            category_id: salaryCategory.id,
            expense_month: month,
            budgeted_amount: monthlyPayroll,
            is_recurring: true,
            notes: `Synced from payroll: ${activeEmployeeCount} employees`,
          });
          if (error) throw error;
          created++;
        }
      }

      return { created, updated };
    },
    onSuccess: ({ created, updated }) => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-expenses"] });
      toast.success(`Payroll synced: ${created} created, ${updated} updated`);
    },
    onError: (error) => {
      toast.error("Failed to sync payroll: " + error.message);
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
      {/* Payroll Sync Card */}
      {monthlyPayroll > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Payroll Integration</CardTitle>
              </div>
              <Button
                onClick={() => syncPayrollMutation.mutate()}
                disabled={syncPayrollMutation.isPending}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncPayrollMutation.isPending ? "animate-spin" : ""}`} />
                Sync to Expenses
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold">{activeEmployeeCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyPayroll)}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Click "Sync to Expenses" to forecast salary costs for the next 12 months
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Expenses
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Expenses from Excel</DialogTitle>
              <DialogDescription>
                Upload your Excel file with expense data. The file should have expense names in the first column 
                and months (Aug-25, Sep-25, etc.) in the header row.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* File Upload Option */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your Excel file (.xlsx or .xls)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="xlsx-upload"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImportingFile}
                    className="w-full max-w-xs"
                  >
                    {isImportingFile ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Excel File
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or paste data</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Paste from Excel</Label>
                  <Textarea
                    placeholder="EXPENSE:&#9;Aug-25&#9;Sep-25&#10;Accounting Fees&#9;R60869.57&#9;R70000.00"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={8}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setImportData("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => importExpensesMutation.mutate(importData)}
                disabled={importExpensesMutation.isPending || !importData.trim()}
              >
                {importExpensesMutation.isPending ? "Importing..." : "Import from Text"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
