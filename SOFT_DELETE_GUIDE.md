# Hướng dẫn: Implement Deleted Rows (Soft Delete)

## Vấn đề hiện tại

Khi xóa dòng, app đang:

1. Shift data lên
2. Regenerate grid từ T values
3. → Grid values bị thay đổi (0-2 thành 0-1)

## Giải pháp: Soft Delete

Thay vì xóa thật, chỉ **đánh dấu** row bị xóa:

- Grid values giữ nguyên
- Chỉ ẩn row khi render
- Không regenerate

---

## Bước 1: Thêm State

```javascript
// Trong App.jsx, thêm state
const [deletedRows, setDeletedRows] = useState(Array(ROWS).fill(false));
```

---

## Bước 2: Update dataService.js

### savePageData

```javascript
export const savePageData = async (
  pageId,
  t1Values,
  t2Values,
  dateValues,
  deletedRows
) => {
  try {
    const pageRef = ref(db, `pages/${pageId}`);

    // Tìm index cuối cùng có data
    let lastIndex = -1;
    for (let i = t1Values.length - 1; i >= 0; i--) {
      if (t1Values[i] || t2Values[i] || dateValues[i]) {
        lastIndex = i;
        break;
      }
    }

    // Trim data
    const trimmedT1 = lastIndex >= 0 ? t1Values.slice(0, lastIndex + 1) : [];
    const trimmedT2 = lastIndex >= 0 ? t2Values.slice(0, lastIndex + 1) : [];
    const trimmedDates =
      lastIndex >= 0 ? dateValues.slice(0, lastIndex + 1) : [];
    const trimmedDeleted =
      lastIndex >= 0 ? deletedRows.slice(0, lastIndex + 1) : [];

    await set(pageRef, {
      pageId,
      t1Values: trimmedT1,
      t2Values: trimmedT2,
      dateValues: trimmedDates,
      deletedRows: trimmedDeleted, // ← Thêm
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### loadPageData

```javascript
export const loadPageData = async (pageId) => {
  try {
    const pageRef = ref(db, `pages/${pageId}`);
    const snapshot = await get(pageRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      const ROWS = 125;
      const t1 = data.t1Values || [];
      const t2 = data.t2Values || [];
      const dates = data.dateValues || [];
      const deleted = data.deletedRows || []; // ← Thêm

      // Pad về ROWS
      while (t1.length < ROWS) t1.push("");
      while (t2.length < ROWS) t2.push("");
      while (dates.length < ROWS) dates.push("");
      while (deleted.length < ROWS) deleted.push(false); // ← Thêm

      return {
        success: true,
        data: {
          t1Values: t1,
          t2Values: t2,
          dateValues: dates,
          deletedRows: deleted, // ← Thêm
        },
      };
    } else {
      return { success: true, data: null };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

---

## Bước 3: Update Load Logic

```javascript
// Trong useEffect load data
if (result.success && result.data) {
  const newAllTValues = [...allTValues];
  newAllTValues[0] = result.data.t1Values;
  newAllTValues[1] = result.data.t2Values;

  setAllTValues(newAllTValues);
  setDateValues(result.data.dateValues || Array(ROWS).fill(""));
  setDeletedRows(result.data.deletedRows || Array(ROWS).fill(false)); // ← Thêm
  setIsDataLoaded(true);

  setTimeout(() => {
    generateTableWithValues(newAllTValues);
  }, 100);
}
```

---

## Bước 4: Update Xóa Logic

### Xóa tất cả

```javascript
if (deleteOption === "all") {
  // Xóa Q1-Q10
  for (let i = 1; i <= 10; i++) {
    await deletePageData(`q${i}`);
  }

  localStorage.clear();

  setAllTValues(
    Array(TOTAL_TABLES)
      .fill(null)
      .map(() => Array(ROWS).fill(""))
  );
  setDateValues(Array(ROWS).fill(""));
  setDeletedRows(Array(ROWS).fill(false)); // ← Reset
  setAllTableData(
    Array(TOTAL_TABLES)
      .fill(null)
      .map(() => [])
  );
  setIsDataLoaded(false);

  alert("✅ Đã xóa tất cả dữ liệu Q1-Q10!");
}
```

### Xóa theo dòng (Soft Delete)

```javascript
else if (deleteOption === "rows") {
  const from = parseInt(deleteRowFrom) - 1;
  const to = parseInt(deleteRowTo) - 1;

  if (isNaN(from) || isNaN(to) || from < 0 || to >= ROWS || from > to) {
    alert("⚠️ Số dòng không hợp lệ!");
    return;
  }

  const deleteCount = to - from + 1;
  const newDeletedRows = [...deletedRows];

  // Đánh dấu deleted (KHÔNG shift)
  for (let i = from; i <= to; i++) {
    newDeletedRows[i] = true;
  }

  setDeletedRows(newDeletedRows);

  // Lưu Q hiện tại
  setSaveStatus("💾 Đang lưu...");
  const result = await savePageData(
    pageId,
    allTValues[0],
    allTValues[1],
    dateValues,
    newDeletedRows  // ← Lưu deletedRows
  );

  // Sync sang Q1-Q10
  for (let i = 1; i <= 10; i++) {
    const qId = `q${i}`;
    if (qId !== pageId) {
      const qResult = await loadPageData(qId);
      if (qResult.success && qResult.data) {
        await savePageData(
          qId,
          qResult.data.t1Values,
          qResult.data.t2Values,
          dateValues,
          newDeletedRows  // ← Sync deletedRows
        );
      }
    }
  }

  if (result.success) {
    setSaveStatus("✅ Đã lưu dữ liệu thành công");
    alert(`✅ Đã ẩn ${deleteCount} dòng (đồng bộ Q1-Q10)!`);
  } else {
    setSaveStatus("⚠️ Lỗi: " + result.error);
  }

  setTimeout(() => setSaveStatus(""), 2000);
}
```

---

## Bước 5: Update Render Logic

### Bảng trái (Input)

```javascript
<tbody>
  {Array.from({ length: ROWS }, (_, rowIndex) => {
    // Skip deleted rows
    if (deletedRows[rowIndex]) return null;

    return (
      <tr key={rowIndex}>
        <td className="data-cell fixed">
          {String(rowIndex).padStart(2, "0")}
        </td>
        <td>
          <input
            type="date"
            value={dateValues[rowIndex] || ""}
            onChange={...}
          />
        </td>
        {/* ... */}
      </tr>
    );
  })}
</tbody>
```

### Bảng phải (Output)

```javascript
<tbody>
  {tableData.map((row, rowIndex) => {
    // Skip deleted rows
    if (deletedRows[rowIndex]) return null;

    return (
      <tr key={rowIndex}>
        <td className="data-cell fixed">{String(rowIndex).padStart(2, "0")}</td>
        {/* ... */}
      </tr>
    );
  })}
</tbody>
```

---

## Kết quả

**Trước (Hard Delete):**

```
Dòng 00: T1=1, Grid: 0-1, 1-1, 2-1, ...
Dòng 01: T1=2, Grid: 0-2, 1-2, 2-2, ...  ← Xóa
Dòng 02: T1=3, Grid: 0-3, 1-3, 2-3, ...

Sau khi xóa dòng 01:
Dòng 00: T1=1, Grid: 0-1, 1-1, 2-1, ...
Dòng 01: T1=3, Grid: 0-3, 1-3, 2-3, ...  ← Shift lên, grid bị đổi!
```

**Sau (Soft Delete):**

```
Dòng 00: T1=1, Grid: 0-1, 1-1, 2-1, ...
Dòng 01: T1=2, Grid: 0-2, 1-2, 2-2, ...  ← Đánh dấu deleted
Dòng 02: T1=3, Grid: 0-3, 1-3, 2-3, ...

Sau khi xóa dòng 01:
Dòng 00: T1=1, Grid: 0-1, 1-1, 2-1, ...
Dòng 01: (ẩn)  ← Không hiển thị
Dòng 02: T1=3, Grid: 0-3, 1-3, 2-3, ...  ← Grid giữ nguyên!
```

---

## Ưu điểm

✅ Grid values giữ nguyên
✅ Không cần regenerate
✅ Có thể "undelete" sau này
✅ Đơn giản hơn shift logic

## Nhược điểm

❌ STT không liên tục (00, 02, 03 nếu xóa 01)
❌ Cần thêm field trong DB

---

## Optional: Compact (Xóa thật)

Nếu muốn compact lại (xóa thật deleted rows):

```javascript
const compactData = () => {
  const newT1 = [];
  const newT2 = [];
  const newDates = [];

  for (let i = 0; i < ROWS; i++) {
    if (!deletedRows[i]) {
      newT1.push(allTValues[0][i]);
      newT2.push(allTValues[1][i]);
      newDates.push(dateValues[i]);
    }
  }

  // Pad
  while (newT1.length < ROWS) {
    newT1.push("");
    newT2.push("");
    newDates.push("");
  }

  setAllTValues([newT1, newT2, ...]);
  setDateValues(newDates);
  setDeletedRows(Array(ROWS).fill(false));

  // Regenerate grid
  generateTableWithValues([newT1, newT2, ...]);
};
```

---

Bạn muốn tôi implement toàn bộ logic này không? 🚀
