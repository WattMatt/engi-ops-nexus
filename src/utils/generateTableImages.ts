import html2canvas from "html2canvas";

/**
 * Generate table images for PDF from report data
 * Returns data URLs for tables
 */
export const generateTableImages = async (
  categories: any[],
  lineItems: any[]
): Promise<{
  categories: string;
  lineItems: string;
}> => {
  // Create temporary container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "800px";
  document.body.appendChild(container);

  try {
    const categoriesCanvas = await createCategoriesTable(container, categories);
    const categoriesDataUrl = categoriesCanvas.toDataURL("image/png");

    const lineItemsCanvas = await createLineItemsTable(container, lineItems);
    const lineItemsDataUrl = lineItemsCanvas.toDataURL("image/png");

    return {
      categories: categoriesDataUrl,
      lineItems: lineItemsDataUrl,
    };
  } finally {
    document.body.removeChild(container);
  }
};

const createCategoriesTable = async (
  container: HTMLElement,
  categories: any[]
): Promise<HTMLCanvasElement> => {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontFamily = "Arial, sans-serif";
  table.style.fontSize = "14px";
  table.style.backgroundColor = "#ffffff";

  // Header
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr style="background-color: #f3f4f6;">
      <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Category</th>
      <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Amount</th>
    </tr>
  `;
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  categories.forEach((cat, index) => {
    const row = document.createElement("tr");
    row.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9fafb";
    row.innerHTML = `
      <td style="padding: 10px; border: 1px solid #e5e7eb;">${cat.category_name || ""}</td>
      <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">
        R ${(cat.total_amount || 0).toLocaleString("en-ZA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </td>
    `;
    tbody.appendChild(row);
  });

  // Total row
  const total = categories.reduce((sum, cat) => sum + (cat.total_amount || 0), 0);
  const totalRow = document.createElement("tr");
  totalRow.style.backgroundColor = "#f3f4f6";
  totalRow.style.fontWeight = "bold";
  totalRow.innerHTML = `
    <td style="padding: 12px; border: 1px solid #e5e7eb;">Total</td>
    <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">
      R ${total.toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </td>
  `;
  tbody.appendChild(totalRow);
  table.appendChild(tbody);

  container.innerHTML = "";
  container.appendChild(table);

  return await html2canvas(container, {
    backgroundColor: "#ffffff",
    scale: 2,
  });
};

const createLineItemsTable = async (
  container: HTMLElement,
  lineItems: any[]
): Promise<HTMLCanvasElement> => {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontFamily = "Arial, sans-serif";
  table.style.fontSize = "12px";
  table.style.backgroundColor = "#ffffff";

  // Header
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr style="background-color: #f3f4f6;">
      <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Description</th>
      <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600;">Qty</th>
      <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Rate</th>
      <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Amount</th>
    </tr>
  `;
  table.appendChild(thead);

  // Body (limit to first 20 items for brevity)
  const tbody = document.createElement("tbody");
  lineItems.slice(0, 20).forEach((item, index) => {
    const row = document.createElement("tr");
    row.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9fafb";
    row.innerHTML = `
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.description || ""}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">
        R ${(item.rate || 0).toLocaleString("en-ZA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">
        R ${(item.amount || 0).toLocaleString("en-ZA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </td>
    `;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  container.innerHTML = "";
  container.appendChild(table);

  return await html2canvas(container, {
    backgroundColor: "#ffffff",
    scale: 2,
  });
};
