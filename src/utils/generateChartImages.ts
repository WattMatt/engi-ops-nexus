import html2canvas from "html2canvas";

/**
 * Generate chart images for PDF from report data
 * Returns data URLs for charts
 */
export const generateChartImages = async (
  categories: any[],
  lineItems: any[]
): Promise<{
  distribution: string;
  variance: string;
}> => {
  // Create temporary container for rendering charts
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "800px";
  document.body.appendChild(container);

  try {
    // Distribution Chart (Pie/Donut)
    const distributionCanvas = await createDistributionChart(container, categories);
    const distributionDataUrl = distributionCanvas.toDataURL("image/png");

    // Variance Chart (Bar)
    const varianceCanvas = await createVarianceChart(container, categories);
    const varianceDataUrl = varianceCanvas.toDataURL("image/png");

    return {
      distribution: distributionDataUrl,
      variance: varianceDataUrl,
    };
  } finally {
    document.body.removeChild(container);
  }
};

const createDistributionChart = async (
  container: HTMLElement,
  categories: any[]
): Promise<HTMLCanvasElement> => {
  // Create SVG pie chart
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "400");
  svg.setAttribute("height", "300");
  svg.setAttribute("viewBox", "0 0 400 300");

  const total = categories.reduce((sum, cat) => sum + (cat.total_amount || 0), 0);
  let currentAngle = -90; // Start at top

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  categories.forEach((cat, index) => {
    const percentage = total > 0 ? (cat.total_amount / total) : 0;
    const angle = percentage * 360;
    
    const startAngle = currentAngle * (Math.PI / 180);
    const endAngle = (currentAngle + angle) * (Math.PI / 180);
    
    const x1 = 200 + 100 * Math.cos(startAngle);
    const y1 = 150 + 100 * Math.sin(startAngle);
    const x2 = 200 + 100 * Math.cos(endAngle);
    const y2 = 150 + 100 * Math.sin(endAngle);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M 200 150 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`);
    path.setAttribute("fill", colors[index % colors.length]);
    path.setAttribute("stroke", "#fff");
    path.setAttribute("stroke-width", "2");
    
    svg.appendChild(path);
    currentAngle += angle;
  });

  container.innerHTML = "";
  container.appendChild(svg);

  return await html2canvas(container, {
    backgroundColor: "#ffffff",
    scale: 2,
  });
};

const createVarianceChart = async (
  container: HTMLElement,
  categories: any[]
): Promise<HTMLCanvasElement> => {
  // Create simple bar chart
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "600");
  svg.setAttribute("height", "300");
  svg.setAttribute("viewBox", "0 0 600 300");

  const maxValue = Math.max(...categories.map(cat => cat.total_amount || 0), 1);
  const barWidth = 500 / categories.length;
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  categories.forEach((cat, index) => {
    const height = ((cat.total_amount || 0) / maxValue) * 200;
    const x = 50 + index * barWidth;
    const y = 250 - height;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", (barWidth * 0.8).toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("fill", colors[index % colors.length]);
    rect.setAttribute("rx", "4");

    svg.appendChild(rect);
  });

  container.innerHTML = "";
  container.appendChild(svg);

  return await html2canvas(container, {
    backgroundColor: "#ffffff",
    scale: 2,
  });
};
