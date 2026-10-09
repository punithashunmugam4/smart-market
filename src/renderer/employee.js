const electronAPI =
  window.electronAPI || window.parent?.electronAPI || window.top?.electronAPI;

const employeeTableBody = document.getElementById("employee-table-body");
const employeeModal = document.getElementById("employee-modal-overlay");
const employeeForm = document.getElementById("employee-form");

function renderEmployees(employees) {
  if (!employeeTableBody) return;

  employeeTableBody.innerHTML = "";

  if (!employees || employees.length === 0) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No employees found.</td>
      </tr>
    `;
    return;
  }

  employees.forEach((employee) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${employee.id || "-"}</td>
      <td>${employee.name || "-"}</td>
      <td>${employee.username || "-"}</td>
      <td>${employee.role || "Employee"}</td>
      <td>${employee.contact || "-"}</td>
      <td>${employee.address || "-"}</td>
    `;
    employeeTableBody.appendChild(row);
  });
}

async function loadEmployees() {
  if (!electronAPI) {
    console.error("Electron API is unavailable in the employee page.");
    renderEmployees([]);
    return;
  }

  try {
    const employees = await electronAPI.getEmployees();
    console.log("Employees loaded:", employees);
    renderEmployees(employees);
  } catch (error) {
    console.error("Failed to load employees:", error);
    renderEmployees([]);
  }
}

function openEmployeeModal() {
  if (!employeeModal) return;
  employeeModal.classList.remove("hidden");
}

function closeEmployeeModal() {
  if (!employeeModal) return;
  employeeModal.classList.add("hidden");
  if (employeeForm) employeeForm.reset();
}

document.getElementById("open-add-employee-modal")?.addEventListener("click", openEmployeeModal);
document.getElementById("employee-modal-close")?.addEventListener("click", closeEmployeeModal);
document.getElementById("cancel-employee-modal")?.addEventListener("click", closeEmployeeModal);

employeeModal?.addEventListener("click", (event) => {
  if (event.target === employeeModal) closeEmployeeModal();
});

employeeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById("employee-name").value.trim(),
    new_username: document.getElementById("employee-username").value.trim(),
    password: document.getElementById("employee-password").value,
    role: document.getElementById("employee-role").value,
    contact: document.getElementById("employee-contact").value.trim(),
    address: document.getElementById("employee-address").value.trim(),
  };

  if (!electronAPI) {
    console.error("Electron API is unavailable while adding an employee.");
    return;
  }

  if (!payload.name || !payload.new_username || !payload.password) {
    electronAPI.toast("Please fill in the required fields.");
    return;
  }

  try {
    const result = await electronAPI.addUser(payload);

    if (result && result.success) {
      electronAPI.toast("Employee added successfully!");
      closeEmployeeModal();
      await loadEmployees();
    } else {
      electronAPI.toast(result?.error || "Failed to add employee.");
    }
  } catch (error) {
    console.error("Add employee failed:", error);
    electronAPI.toast("Unable to add employee.");
  }
});

loadEmployees();
