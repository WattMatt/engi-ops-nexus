import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryCard } from "./CategoryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedExport: () => void;
  report: any;
  categories: any[];
  variations: any[];
  companyName?: string;
  projectInfo?: any;
  contractors?: any[];
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const ExportPreviewDialog = ({ 
  open, 
  onOpenChange, 
  onProceedExport,
  report,
  categories,
  variations,
  companyName = "Your Company",
  projectInfo,
  contractors = []
}: ExportPreviewDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleProceed = async () => {
    setIsExporting(true);
    await onProceedExport();
    setIsExporting(false);
    onOpenChange(false);
  };

  // Calculate totals
  const totalBudget = categories.reduce((sum, cat) => sum + Number(cat.budget_amount || 0), 0);
  const totalActual = categories.reduce((sum, cat) => sum + Number(cat.actual_cost || 0), 0);
  const totalVariance = totalBudget - totalActual;
  const variancePercentage = totalBudget > 0 ? ((totalVariance / totalBudget) * 100) : 0;

  // Prepare chart data
  const categoryChartData = categories.map(cat => ({
    name: cat.category_name,
    budget: Number(cat.budget_amount || 0),
    actual: Number(cat.actual_cost || 0)
  }));

  const pieChartData = categories.map(cat => ({
    name: cat.category_name,
    value: Number(cat.actual_cost || 0)
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview: UI vs PDF Export</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Compare the live UI (left) with how it will appear in the PDF (right)
          </p>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left Side - Live UI Preview */}
          <div className="border rounded-lg bg-muted/30 flex flex-col">
            <div className="p-3 border-b bg-background">
              <h3 className="font-semibold text-sm">Live UI Preview</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {/* Cover Page Preview */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardHeader>
                    <CardTitle className="text-center">Cover Page</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">{companyName}</p>
                      <h2 className="text-2xl font-bold">Cost Report</h2>
                      <p className="text-lg">{report.project_name}</p>
                      <p className="text-sm text-muted-foreground">Report #{report.report_number}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Executive Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Budget</p>
                        <p className="text-2xl font-bold">R {totalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Actual</p>
                        <p className="text-2xl font-bold">R {totalActual.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Variance</p>
                        <p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R {Math.abs(totalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {variancePercentage.toFixed(1)}% {totalVariance >= 0 ? 'under' : 'over'} budget
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Charts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Budget vs Actual by Category</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={categoryChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="budget" fill="hsl(var(--chart-1))" name="Budget" />
                          <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Cost Distribution</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Cards Preview */}
                <div>
                  <h3 className="font-semibold mb-3">Category Performance Details</h3>
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onUpdate={() => {}}
                      />
                    ))}
                  </div>
                </div>

                {/* Project Information */}
                {projectInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(projectInfo).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="font-medium">{value as string}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contractors */}
                {contractors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Contractors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {contractors.map((contractor, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 border rounded">
                            <span className="font-medium">{contractor.name}</span>
                            <span className="text-sm text-muted-foreground">{contractor.role}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Category Breakdowns */}
                <div>
                  <h3 className="font-semibold mb-3">Detailed Category Breakdowns</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Each category will have a dedicated page with line items
                  </p>
                  {categories.map((category) => (
                    <Card key={category.id} className="mb-3">
                      <CardHeader>
                        <CardTitle className="text-sm">{category.category_name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          {category.cost_line_items?.length || 0} line items will be detailed in PDF
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Variations */}
                {variations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Variations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {variations.length} variation(s) will be included
                      </p>
                      <div className="space-y-2">
                        {variations.slice(0, 3).map((variation) => (
                          <div key={variation.id} className="text-xs p-2 border rounded">
                            <p className="font-medium">{variation.description}</p>
                            <p className="text-muted-foreground">
                              R {Number(variation.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        ))}
                        {variations.length > 3 && (
                          <p className="text-xs text-muted-foreground italic">+ {variations.length - 3} more</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Side - PDF Preview */}
          <div className="border rounded-lg bg-muted/30 flex flex-col">
            <div className="p-3 border-b bg-background">
              <h3 className="font-semibold text-sm">PDF Export Preview</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="bg-white p-8 space-y-6 text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
                {/* Cover Page Preview */}
                <div className="border-b pb-6 text-center bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded">
                  <p className="text-sm text-gray-600 mb-2">{companyName}</p>
                  <h1 className="text-3xl font-bold mb-4">Cost Report</h1>
                  <p className="text-xl mb-2">{report.project_name}</p>
                  <p className="text-sm text-gray-600">Report #{report.report_number}</p>
                </div>

                {/* Executive Summary */}
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Budget</p>
                      <p className="text-2xl font-bold">R {totalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Actual</p>
                      <p className="text-2xl font-bold">R {totalActual.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Variance</p>
                      <p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R {Math.abs(totalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {variancePercentage.toFixed(1)}% {totalVariance >= 0 ? 'under' : 'over'} budget
                      </p>
                    </div>
                  </div>
                </div>

                {/* Charts Preview */}
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold mb-4">Financial Analysis</h2>
                  <p className="text-sm text-gray-600">Charts will be captured from UI at high quality</p>
                  <div className="space-y-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm font-semibold mb-2">Budget vs Actual by Category</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={categoryChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} style={{ fontSize: '10px' }} />
                          <YAxis style={{ fontSize: '10px' }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="budget" fill="hsl(var(--chart-1))" name="Budget" />
                          <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Category Cards Preview */}
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold mb-4">Category Performance Details</h2>
                  <p className="text-sm text-gray-600 mb-3">Captured from UI</p>
                  <div className="space-y-4">
                    {categories.slice(0, 2).map((category) => {
                      const variance = Number(category.budget_amount || 0) - Number(category.actual_cost || 0);
                      const variancePct = Number(category.budget_amount) > 0 
                        ? ((variance / Number(category.budget_amount)) * 100) 
                        : 0;
                      
                      return (
                        <div key={category.id} className="border rounded p-4 bg-gray-50">
                          <h3 className="font-bold text-lg mb-2">{category.category_name}</h3>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Budget</p>
                              <p className="font-semibold">R {Number(category.budget_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Actual</p>
                              <p className="font-semibold">R {Number(category.actual_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Variance</p>
                              <p className={`font-semibold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R {Math.abs(variance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-gray-600">
                                {variancePct.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {categories.length > 2 && (
                      <p className="text-sm text-gray-600 italic">+ {categories.length - 2} more categories</p>
                    )}
                  </div>
                </div>

                {/* Project Information Preview */}
                {projectInfo && (
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold mb-4">Project Information</h2>
                    <p className="text-sm text-gray-600 mb-3">Captured from UI</p>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600">Project details section will appear here</p>
                    </div>
                  </div>
                )}

                {/* Contractors Preview */}
                {contractors.length > 0 && (
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold mb-4">Contractors</h2>
                    <p className="text-sm text-gray-600 mb-3">Captured from UI</p>
                    <div className="bg-gray-50 p-4 rounded space-y-2">
                      {contractors.slice(0, 2).map((contractor, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-semibold">{contractor.name}</span> - {contractor.role}
                        </div>
                      ))}
                      {contractors.length > 2 && (
                        <p className="text-xs text-gray-600 italic">+ {contractors.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Category Detail Pages */}
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold mb-4">Detailed Category Breakdowns</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    Each category will have a dedicated page with all line items
                  </p>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-xs text-gray-600">{categories.length} category detail page(s)</p>
                  </div>
                </div>

                {/* Variations Preview */}
                {variations.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Variations</h2>
                    <p className="text-sm text-gray-600 mb-3">{variations.length} variation(s)</p>
                    <div className="bg-gray-50 p-4 rounded space-y-2">
                      {variations.slice(0, 2).map((variation) => (
                        <div key={variation.id} className="text-sm border-l-2 border-blue-500 pl-2">
                          <p className="font-semibold">{variation.description}</p>
                          <p className="text-gray-600">
                            R {Number(variation.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                      {variations.length > 2 && (
                        <p className="text-xs text-gray-600 italic">+ {variations.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleProceed} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Generating PDF...' : 'Proceed with Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
