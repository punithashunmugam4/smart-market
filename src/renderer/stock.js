//testing sample data
let data = [
  {
    product_id: 1231,
    product_name: "Kitkat",
    price: 20,
    stock_quantity: 20,
    stock_threshold: 10,
    unit: "pcs",
  },
  {
    product_id: 3414,
    product_name: "Wheat_1kg",
    price: 40,
    stock_quantity: 10,
    stock_threshold: 5,
    unit: "pcs",
  },
  {
    product_id: 41341,
    product_name: "Daal",
    price: 120,
    stock_quantity: 30,
    stock_threshold: 15,
    unit: "kg",
  },
  {
    product_id: 124531,
    product_name: "lolipop",
    price: 5,
    stock_quantity: 20,
    stock_threshold: 10,
    unit: "pcs",
  },
];

const electronAPI =
  window.electronAPI || window.parent?.electronAPI || window.top?.electronAPI;

function showAddNewItemModal() {
  const overlay = document.createElement("div");
  overlay.className = "new-item-overlay";
  overlay.innerHTML = `
    <div class="new-item-modal" role="dialog" aria-modal="true" aria-label="Add new item to the sales">
      <div class="new-item-body">
        <h3>Add new item to the sales</h3>
        <form class="new-item-form">
            <input type="text" id="item-name" name="item-name" placeholder="Item Name" required />
    
            <input type="number" id="item-price" name="item-price" placeholder="Price" required min="0" step="0.01" />
       
            <select id="item-unit" name="item-unit" required>
                <option value="" disabled selected>Select unit</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
            </select>
        
            <input type="number" id="item-quantity" name="item-quantity" placeholder="Quantity" required min="0" step="1" />
       
            <input type="number" id="item-threshold" name="item-threshold" placeholder="Stock Threshold" required min="0" step="1" />
        </form>
      </div>
      <div class="new-item-actions">
      <button class="btn confirm">Add item</button>
        <button class="btn secondary cancel">Cancel</button>
        
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay
    .querySelector(".cancel")
    .addEventListener("click", closeAddNewItemModal);
  overlay.querySelector(".confirm").addEventListener("click", async () => {
    try {
      let newItem = await electronAPI.addProduct({
        product_name: document.getElementById("item-name").value,
        price: parseFloat(document.getElementById("item-price").value),
        unit: document.getElementById("item-unit").value,
        stock_quantity: parseInt(
          document.getElementById("item-quantity").value,
        ),
        stock_threshold: parseInt(
          document.getElementById("item-threshold").value,
        ),
      });
      console.log("New item added:", newItem);
      electronAPI.toast("Item added successfully!");
    } finally {
      closeAddNewItemModal();
      const newRow = document.createElement("tr");
      const item = await electronAPI
        .getStockItems()
        .then((res) => {
          console.log("All stock items after adding new item:", res);
          return res.data.slice(-1)[0];
        });
      newRow.innerHTML = `<td>${item.product_id}</td>
      <td>${item.product_name}</td>
      <td>${item.price}</td>
      <td>${item.stock_quantity}</td>
      <td>${item.stock_threshold}</td>
      <td>${item.unit}</td>`;
      document.querySelector("#stock-table tbody").appendChild(newRow);
    }
  });

  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeAddNewItemModal();
  });
}

function closeAddNewItemModal() {
  const existing = document.querySelector(".new-item-overlay");
  if (existing) existing.remove();
}

document
  .getElementById("add-item-btn")
  .addEventListener("click", showAddNewItemModal);

document.addEventListener("DOMContentLoaded", async () => {
  const stockItems = await electronAPI.getStockItems();
  console.log("Stock items loaded:", stockItems);
  const tbody = document.getElementById("stock-table-body");
  stockItems.data.length > 0 &&
    stockItems.data.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${item.product_id}</td>

      <td>${item.product_name}</td>
      <td>${item.price}</td>
      <td>${item.stock_quantity}</td> 
      <td>${item.stock_threshold}</td>
      <td>${item.unit}</td>`;
      tbody.appendChild(row);
    });
});
