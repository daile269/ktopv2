import { useState, useEffect, useRef, Fragment } from "react";
import "./App.css";
import "./TopToolbar.css";
import { savePageData, loadPageData, deletePageData } from "./dataService";
import InputPage from "./InputPage";

function App() {
  const TOTAL_TABLES = 80;
  const ROWS = 126;

  const [allTableData, setAllTableData] = useState(
    Array(TOTAL_TABLES)
      .fill(null)
      .map(() => []),
  );
  const [allTValues, setAllTValues] = useState(
    Array(TOTAL_TABLES)
      .fill(null)
      .map(() => Array(ROWS).fill("")),
  );
  const [dateValues, setDateValues] = useState(Array(126).fill(""));
  const [sourceSTTValues, setSourceSTTValues] = useState(Array(126).fill(""));
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const [aValues, setAValues] = useState(Array(126).fill(""));
  const [bValues, setBValues] = useState(Array(126).fill(""));

  const [highlightedCells, setHighlightedCells] = useState({});
  const [highlightedTCells, setHighlightedTCells] = useState({});
  const [highlightedTColumns, setHighlightedTColumns] = useState({});
  const [highlightedACells, setHighlightedACells] = useState({});
  const [highlightedBCells, setHighlightedBCells] = useState({});
  const [highlightedAColumn, setHighlightedAColumn] = useState(false);
  const [highlightedBColumn, setHighlightedBColumn] = useState(false);
  const [highlightedDataColumns, setHighlightedDataColumns] = useState({});
  // { rowIndex: true } — highlight cả hàng
  const [highlightedRows, setHighlightedRows] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState("all");
  const [deleteDateFrom, setDeleteDateFrom] = useState("");
  const [deleteDateTo, setDeleteDateTo] = useState("");
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowDate, setNewRowDate] = useState("");
  const [newRowT1, setNewRowT1] = useState("");
  const [newRowT2, setNewRowT2] = useState("");
  const [newRowZ, setNewRowZ] = useState("");
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [keepLastNRows, setKeepLastNRows] = useState("");
  const [deletedRows, setDeletedRows] = useState(Array(126).fill(false));
  const [zValues, setZValues] = useState(Array(126).fill(""));
  const [showDeleteFirstRowModal, setShowDeleteFirstRowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showKeepLastNRowsModal, setShowKeepLastNRowsModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteByDatesModal, setShowDeleteByDatesModal] = useState(false);
  const [showDeleteLastRowModal, setShowDeleteLastRowModal] = useState(false);
  const [showKeepLastNRowsSettingsModal, setShowKeepLastNRowsSettingsModal] =
    useState(false);
  const [tempKeepLastNRows, setTempKeepLastNRows] = useState("");
  const [isSavingKeepLastNRows, setIsSavingKeepLastNRows] = useState(false);
  const tableRefs = useRef([]);
  const isScrollingRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const [deleteRowFrom, setDeleteRowFrom] = useState("");
  const [deleteRowTo, setDeleteRowTo] = useState("");
  const [showDeleteByRowsModal, setShowDeleteByRowsModal] = useState(false);
  const [goToTableNumber, setGoToTableNumber] = useState("");
  const [pageLabel, setPageLabel] = useState("");

  const pathname = window.location.pathname.slice(1);
  const pageId = pathname || "q1";

  // Helper function to format date to Vietnamese
  const formatDateToVietnamese = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `ngày ${parseInt(day)} tháng ${parseInt(month)} năm ${year}`;
    }
    return dateString;
  };

  // Load dữ liệu từ Firestore khi component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await loadPageData(pageId);
        console.log("📥 Dữ liệu tải về:", result);
        if (result.success && result.data) {
          setAValues(result.data.aValues || Array(ROWS).fill(""));
          setBValues(result.data.bValues || Array(ROWS).fill(""));
          setZValues(result.data.zValues || Array(ROWS).fill(""));
          setDateValues(result.data.dateValues || Array(ROWS).fill(""));
          setSourceSTTValues(
            result.data.sourceSTTValues || Array(ROWS).fill(""),
          );
          setDeletedRows(result.data.deletedRows || Array(ROWS).fill(false));
          setPageLabel(result.data.pageLabel || "");

          if (result.data.keepLastNRows) {
            setKeepLastNRows(result.data.keepLastNRows);
          } else {
            let nonDeletedCount = 0;
            for (let i = 0; i < ROWS; i++) {
              if (!result.data.deletedRows?.[i]) nonDeletedCount++;
            }
            setKeepLastNRows(nonDeletedCount);
          }
          setIsDataLoaded(true);
        } else {
          setIsDataLoaded(true);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [pageId]);

  // Handle Generate logic (extracted to use in effect)
  const generateTableDataArr = (tValues, skipColor = false) => {
    let actualRows = 0;
    for (let i = dateValues.length - 1; i >= 0; i--) {
      if (dateValues[i] || tValues[i]) {
        actualRows = i + 1;
        break;
      }
    }
    if (actualRows === 0) return [];
    const table = Array(actualRows)
      .fill(null)
      .map(() => Array(10).fill(null));
    for (let col = 0; col < 10; col++) {
      let y = 1;
      for (let row = 0; row < actualRows; row++) {
        // Bỏ qua hàng rỗng hoàn toàn để không làm tăng y (skip count)
        if (tValues[row] === "" && !dateValues[row]) {
          table[row][col] = { value: "", color: "white" };
          continue;
        }

        const tVal = tValues[row] !== "" ? parseInt(tValues[row]) : -1;
        const isRed = col === tVal && tVal !== -1;
        let color = isRed ? "red" : "white";

        table[row][col] = { value: `${col}-${y}`, color: color };
        y++;
        if (isRed) y = 1;
      }
    }
    return table;
  };

  const generateAllTables = () => {
    console.log("🌀 Bắt đầu tính toán 80 bảng T...");
    let actualRows = 0;
    for (let i = ROWS - 1; i >= 0; i--) {
      if (aValues[i] || bValues[i] || dateValues[i]) {
        actualRows = i + 1;
        break;
      }
    }
    const newTValuesArr = Array(TOTAL_TABLES)
      .fill(null)
      .map(() => Array(ROWS).fill(""));
    const newTableDataArr = [];
    for (let i = 0; i < TOTAL_TABLES; i++) {
      let v1, v2;
      if (i === 0) {
        v1 = aValues;
        v2 = bValues;
      } else if (i === 1) {
        v1 = bValues;
        v2 = newTValuesArr[0];
      } else {
        v1 = newTValuesArr[i - 2];
        v2 = newTValuesArr[i - 1];
      }
      for (let r = 0; r < actualRows; r++) {
        // Chỉ tính toán nếu hàng có dữ liệu (có A hoặc B)
        if (v1[r] === "" && v2[r] === "" && !dateValues[r]) {
          newTValuesArr[i][r] = "";
          continue;
        }
        const n1 = parseInt(v1[r]) || 0;
        const n2 = parseInt(v2[r]) || 0;
        newTValuesArr[i][r] = String((n1 + n2) % 10);
      }
      // skipColor = true for T3-T10 (i > 1)
      newTableDataArr.push(generateTableDataArr(newTValuesArr[i], false)); // Hiện báo màu ở tất cả các bảng
    }
    setAllTValues(newTValuesArr);
    setAllTableData(newTableDataArr);
  };

  useEffect(() => {
    if (isDataLoaded) generateAllTables();
  }, [dateValues, aValues, bValues, isDataLoaded, deletedRows]);
  useEffect(() => {
    if (isDataLoaded && allTableData.length > 0) {
      setTimeout(() => {
        tableRefs.current.forEach(
          (ref) => ref && (ref.scrollTop = ref.scrollHeight),
        );
      }, 150);
    }
  }, [isDataLoaded, pageId, allTableData]);

  if (pathname === "input") {
    return <InputPage />;
  }

  // Handle sync scroll
  const handleSyncScroll = (e, index) => {
    // Nếu đang scroll bởi bảng khác thì bỏ qua
    if (isScrollingRef.current !== null && isScrollingRef.current !== index) {
      return;
    }

    // Đánh dấu bảng này đang chủ động scroll
    isScrollingRef.current = index;

    const { scrollTop } = e.target;

    tableRefs.current.forEach((ref, i) => {
      if (ref && i !== index) {
        // Chỉ cập nhật nếu có sự thay đổi để tránh repaint không cần thiết
        if (Math.abs(ref.scrollTop - scrollTop) > 1) {
          ref.scrollTop = scrollTop;
        }
      }
    });

    // Reset cờ khi ngừng scroll
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = null;
    }, 50);
  };

  // Handle Go To Table
  const handleGoToTable = () => {
    const tableNum = parseInt(goToTableNumber);

    if (isNaN(tableNum) || tableNum < 1 || tableNum > TOTAL_TABLES) {
      alert(`⚠️ Vui lòng nhập số từ 1 đến ${TOTAL_TABLES}`);
      return;
    }

    // Tìm element của bảng T
    const tableIndex = tableNum - 1;
    const tableElement =
      document.querySelectorAll(".table-section")[tableIndex];

    if (tableElement) {
      tableElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });
      setGoToTableNumber(""); // Reset input
    } else {
      alert(`⚠️ Không tìm thấy bảng T${tableNum}`);
    }
  };

  // Duplicated effects removed, moved to top.

  // Helper để lấy dòng tương lai (dòng gợi ý tiếp theo)
  const getFutureRow = (tableData) => {
    if (!tableData || tableData.length === 0)
      return Array(10).fill({ value: "", color: "white" });

    const futureRow = [];
    for (let col = 0; col < 10; col++) {
      let lastCell = null;
      for (let row = tableData.length - 1; row >= 0; row--) {
        if (tableData[row][col] && tableData[row][col].value !== "") {
          lastCell = tableData[row][col];
          break;
        }
      }

      let nextY;
      if (!lastCell) {
        nextY = 1;
      } else {
        const parts = lastCell.value.split("-");
        const lastY = parseInt(parts[1]) || 0;
        const isRed = lastCell.color && lastCell.color.includes("red");
        nextY = isRed ? 1 : lastY + 1;
      }

      futureRow.push({ value: `${col}-${nextY}`, color: "white" });
    }
    return futureRow;
  };

  const generateTable = () => {
    generateAllTables();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    // Dùng setTimeout để UI có thời gian hiển thị loading
    setTimeout(async () => {
      generateTable();
      setIsGenerating(false);

      // Lưu dữ liệu lên Firebase sau khi tính xong
      setSaveStatus("💾 Đang lưu...");
      const result = await savePageData(
        pageId,
        aValues,
        bValues,
        zValues,
        dateValues,
        deletedRows,
        sourceSTTValues,
        0,
        0,
        keepLastNRows,
        undefined,
        pageLabel,
      );

      if (result.success) {
        // ⭐ Sync purple range sang tất cả Q1-Q10
        const syncPromises = [];
        for (let i = 1; i <= 10; i++) {
          const qId = `q${i}`;
          if (qId !== pageId) {
            const qResult = await loadPageData(qId);
            if (qResult.success && qResult.data) {
              syncPromises.push(
                savePageData(
                  qId,
                  qResult.data.aValues,
                  qResult.data.bValues,
                  qResult.data.zValues || Array(ROWS).fill(""),
                  dateValues,
                  deletedRows,
                  sourceSTTValues,
                  0, // ⭐ Sync purple range
                  0, // ⭐ Sync purple range
                  keepLastNRows,
                  undefined,
                  qResult.data.pageLabel || "",
                ),
              );
            }
          }
        }

        await Promise.all(syncPromises);
        setSaveStatus("✅ Đã lưu và đồng bộ");
      } else {
        setSaveStatus("⚠️ Lỗi: " + result.error);
        setError(result.error);
      }

      setTimeout(() => setSaveStatus(""), 2000);
    }, 100);
  };

  // Save data without regenerating tables
  const handleSaveData = async () => {
    setSaveStatus("💾 Đang lưu...");

    // Save Q hiện tại
    const result = await savePageData(
      pageId,
      aValues,
      bValues,
      zValues,
      dateValues,
      deletedRows,
      sourceSTTValues,
      0,
      0,
      keepLastNRows,
      undefined,
      pageLabel,
    );

    if (result.success) {
      // ⭐ Sync purple range sang tất cả Q1-Q10 (không sync T values)
      const syncPromises = [];
      for (let i = 1; i <= 10; i++) {
        const qId = `q${i}`;
        if (qId !== pageId) {
          // Load data của Q này
          const qResult = await loadPageData(qId);
          if (qResult.success && qResult.data) {
            // Chỉ update purple range
            syncPromises.push(
              savePageData(
                qId,
                qResult.data.aValues,
                qResult.data.bValues,
                qResult.data.zValues || Array(ROWS).fill(""),
                dateValues,
                deletedRows,
                sourceSTTValues,
                0, // ⭐ Sync purple range từ Q hiện tại
                0, // ⭐ Sync purple range từ Q hiện tại
                keepLastNRows,
                undefined,
                qResult.data.pageLabel || "",
              ),
            );
          }
        }
      }

      await Promise.all(syncPromises);
      setSaveStatus("✅ Đã lưu và đồng bộ");
    } else {
      setSaveStatus("⚠️ Lỗi: " + result.error);
      setError(result.error);
    }

    setTimeout(() => setSaveStatus(""), 2000);
  };

  // Handle click vào cell lẻ - highlight từng ô (độc lập, không mất ô cũ)
  const handleCellClick = (tableIndex, rowIndex, colIndex) => {
    setHighlightedCells((prev) => {
      const currentTable = prev[tableIndex] || {};
      const currentRow = currentTable[rowIndex] || {};

      const newRow = { ...currentRow };
      if (newRow[colIndex]) {
        delete newRow[colIndex];
      } else {
        newRow[colIndex] = true;
      }

      return {
        ...prev,
        [tableIndex]: {
          ...currentTable,
          [rowIndex]: newRow,
        },
      };
    });
  };

  // Handle click vào ô T (từng ô) - toggle màu cam
  const handleTCellClick = (tableIndex, rowIndex) => {
    setHighlightedTCells((prev) => {
      const currentTable = prev[tableIndex] || {};
      const newTable = { ...currentTable };
      if (newTable[rowIndex]) {
        delete newTable[rowIndex];
      } else {
        newTable[rowIndex] = true;
      }
      return {
        ...prev,
        [tableIndex]: newTable,
      };
    });
  };

  // Handle click vào header cột T - toggle cả cột màu vàng
  const handleTColClick = (tableIndex) => {
    setHighlightedTColumns((prev) => ({
      ...prev,
      [tableIndex]: !prev[tableIndex],
    }));
  };

  const handleACellClick = (rowIndex) => {
    setHighlightedACells((prev) => {
      const newHighlighted = { ...prev };
      if (newHighlighted[rowIndex]) {
        delete newHighlighted[rowIndex];
      } else {
        newHighlighted[rowIndex] = true;
      }
      return newHighlighted;
    });
  };

  const handleBCellClick = (rowIndex) => {
    setHighlightedBCells((prev) => {
      const newHighlighted = { ...prev };
      if (newHighlighted[rowIndex]) {
        delete newHighlighted[rowIndex];
      } else {
        newHighlighted[rowIndex] = true;
      }
      return newHighlighted;
    });
  };

  // Click header cột A/B - toggle cả cột màu vàng
  const handleAColClick = () => setHighlightedAColumn((prev) => !prev);
  const handleBColClick = () => setHighlightedBColumn((prev) => !prev);

  // Click vào STT hoặc Ngày — toggle highlight cả hàng màu cam nhạt
  const handleRowClick = (rowIndex) => {
    setHighlightedRows((prev) => ({
      ...prev,
      [rowIndex]: !prev[rowIndex],
    }));
  };

  // Clear tất cả highlight
  const clearColumnHighlights = () => {
    setHighlightedTCells({});
    setHighlightedTColumns({});
    setHighlightedACells({});
    setHighlightedBCells({});
    setHighlightedAColumn(false);
    setHighlightedBColumn(false);
    setHighlightedCells({});
    setHighlightedRows({});
  };

  // Navigate to input page
  const handleInputAllQ = () => {
    window.location.href = "/input";
  };

  const handleAValueChange = (rowIndex, value) => {
    const newAValues = [...aValues];
    newAValues[rowIndex] = value;
    setAValues(newAValues);
  };

  const handleBValueChange = (rowIndex, value) => {
    const newBValues = [...bValues];
    newBValues[rowIndex] = value;
    setBValues(newBValues);
  };

  // Add new row - show modal
  const handleAddRow = () => {
    setNewRowDate(""); // Reset date
    setNewRowT1(""); // Reuse T1 state as A
    setNewRowT2(""); // Reuse T2 state as B
    setNewRowZ(""); // Add Z
    setShowAddRowModal(true);
  };

  // Confirm add row with selected date
  const confirmAddRow = async () => {
    if (!newRowDate) {
      alert("⚠️ Vui lòng chọn ngày!");
      return;
    }

    setIsAddingRow(true);

    // Find the last non-empty row
    let lastRowIndex = -1;
    for (let i = ROWS - 1; i >= 0; i--) {
      // Skip deleted rows
      if (deletedRows[i]) continue;

      // Check if row has data
      if (dateValues[i] || allTValues[0][i] || allTValues[1][i]) {
        lastRowIndex = i;
        break;
      }
    }

    const newRowIndex = lastRowIndex + 1;

    if (newRowIndex >= ROWS) {
      alert("⚠️ Đã đạt giới hạn số hàng!");
      setShowAddRowModal(false);
      return;
    }

    // Initialize new row with date
    const newDateValues = [...dateValues];
    const newAValues = [...aValues];
    const newBValues = [...bValues];
    const newZValues = [...zValues];
    const newDeletedRows = [...deletedRows];

    // Set values for new row
    newDateValues[newRowIndex] = newRowDate;
    newAValues[newRowIndex] = newRowT1; // Giờ là A
    newBValues[newRowIndex] = newRowT2; // Giờ là B
    newZValues[newRowIndex] = ""; // Không dùng Z nữa
    newDeletedRows[newRowIndex] = false;

    setDateValues(newDateValues);
    setAValues(newAValues);
    setBValues(newBValues);
    setZValues(newZValues);
    setDeletedRows(newDeletedRows);

    // Sync to all Q1-Q10
    setSaveStatus("💾 Đang đồng bộ...");
    const syncPromises = [];
    for (let i = 1; i <= 10; i++) {
      const qId = `q${i}`;
      const result = await loadPageData(qId);
      if (result.success && result.data) {
        const qA = [...(result.data.aValues || [])];
        const qB = [...(result.data.bValues || [])];
        const qZ = [...(result.data.zValues || [])];
        qA[newRowIndex] = newRowT1;
        qB[newRowIndex] = newRowT2;
        qZ[newRowIndex] = "";

        syncPromises.push(
          savePageData(
            qId,
            qA,
            qB,
            qZ,
            newDateValues,
            newDeletedRows,
            sourceSTTValues,
            0,
            0,
            keepLastNRows,
          ),
        );
      }
    }

    await Promise.all(syncPromises);
    setSaveStatus("✅ Đã thêm hàng mới và đồng bộ");

    setShowAddRowModal(false);
    setIsAddingRow(false);

    alert(`✅ Đã thêm hàng mới với ngày ${newRowDate}`);

    // Refresh trang để load lại effect
    window.location.reload();
  };

  // Function to apply the 'Keep last N rows' rule
  const applyKeepLastNRows = async (n) => {
    if (!n || n <= 0) {
      alert("⚠️ Vui lòng nhập số dòng hợp lệ (> 0)");
      return;
    }

    // Find all NON-DELETED rows with data
    const nonDeletedRowsWithData = [];
    for (let i = 0; i < ROWS; i++) {
      // Chỉ xét các dòng CHƯA xóa
      if (
        !deletedRows[i] &&
        (dateValues[i] || aValues[i] || bValues[i] || zValues[i])
      ) {
        nonDeletedRowsWithData.push(i);
      }
    }

    if (nonDeletedRowsWithData.length === 0) {
      alert("⚠️ Không có dòng nào có dữ liệu (chưa xóa)!");
      return;
    }

    // Keep only last N rows from non-deleted rows
    const rowsToKeep = nonDeletedRowsWithData.slice(-n);

    // Giữ nguyên deletedRows hiện tại, chỉ cập nhật các dòng chưa xóa
    const newDeletedRows = [...deletedRows];

    // Chỉ đánh dấu deleted cho các dòng CHƯA xóa mà không nằm trong rowsToKeep
    for (let i = 0; i < ROWS; i++) {
      // Chỉ tác động vào các dòng chưa xóa
      if (!deletedRows[i]) {
        // Nếu dòng này không nằm trong rowsToKeep thì đánh dấu xóa
        if (!rowsToKeep.includes(i)) {
          newDeletedRows[i] = true;
        }
      }
    }

    setDeletedRows(newDeletedRows);

    // Sync to all Q1-Q10
    setSaveStatus("💾 Đang đồng bộ...");
    const syncPromises = [];
    for (let i = 1; i <= 10; i++) {
      const qId = `q${i}`;
      const result = await loadPageData(qId);
      if (result.success && result.data) {
        syncPromises.push(
          savePageData(
            qId,
            result.data.aValues,
            result.data.bValues,
            result.data.zValues || Array(ROWS).fill(""),
            dateValues,
            newDeletedRows,
            sourceSTTValues,
            0,
            0,
            n, // Use the new n
            undefined,
            result.data.pageLabel || "",
          ),
        );
      }
    }

    await Promise.all(syncPromises);
    setSaveStatus("✅ Đã giữ " + n + " dòng cuối và đồng bộ");
    setTimeout(() => setSaveStatus(""), 2000);

    alert(`✅ Đã xóa các dòng cũ, giữ lại ${n} dòng cuối cùng!`);
  };

  // Keep last N rows - handler for the button
  const handleKeepLastNRows = async () => {
    const n = parseInt(keepLastNRows);
    await applyKeepLastNRows(n);
  };

  // Delete last visible row - XÓA THẬT SỰ khỏi DB
  const handleDeleteLastRow = async () => {
    // Tìm dòng cuối cùng (dòng không bị xóa cuối cùng)
    let lastRowIndex = -1;
    for (let i = ROWS - 1; i >= 0; i--) {
      if (!deletedRows[i]) {
        // Check if row has data
        if (dateValues[i] || aValues[i] || bValues[i] || zValues[i]) {
          lastRowIndex = i;
          break;
        }
      }
    }

    if (lastRowIndex === -1) {
      alert("⚠️ Không có dòng nào để xóa!");
      setShowDeleteLastRowModal(false);
      return;
    }

    // XÓA THẬT SỰ: Xóa dòng khỏi arrays
    const newAValues = [...aValues];
    const newBValues = [...bValues];
    const newZValues = [...zValues];
    const newDateValues = [...dateValues];
    const newDeletedRows = [...deletedRows];

    // Xóa phần tử tại index lastRowIndex
    newAValues.splice(lastRowIndex, 1);
    newBValues.splice(lastRowIndex, 1);
    newZValues.splice(lastRowIndex, 1);
    newDateValues.splice(lastRowIndex, 1);
    newDeletedRows.splice(lastRowIndex, 1);

    // Thêm phần tử trống vào cuối để giữ đủ ROWS phần tử
    newAValues.push("");
    newBValues.push("");
    newZValues.push("");
    newDateValues.push("");
    newDeletedRows.push(false);

    setAValues(newAValues);
    setBValues(newBValues);
    setZValues(newZValues);
    setDateValues(newDateValues);
    setDeletedRows(newDeletedRows);

    // Sync to all Q1-Q10
    setSaveStatus("💾 Đang đồng bộ...");
    const syncPromises = [];
    for (let i = 1; i <= 10; i++) {
      const qId = `q${i}`;
      const result = await loadPageData(qId);
      if (result.success && result.data) {
        // Xóa dòng khỏi A, B của Q này
        const qA = [...(result.data.aValues || [])];
        const qB = [...(result.data.bValues || [])];
        const qZ = [...(result.data.zValues || [])];

        qA.splice(lastRowIndex, 1);
        qB.splice(lastRowIndex, 1);
        qZ.splice(lastRowIndex, 1);
        qA.push("");
        qB.push("");
        qZ.push("");

        syncPromises.push(
          savePageData(
            qId,
            qA,
            qB,
            qZ,
            newDateValues,
            newDeletedRows,
            sourceSTTValues,
            0,
            0,
            keepLastNRows,
          ),
        );
      }
    }

    await Promise.all(syncPromises);
    setSaveStatus("✅ Đã xóa dòng cuối cùng và đồng bộ");
    setTimeout(() => setSaveStatus(""), 2000);

    setShowDeleteLastRowModal(false);
    alert(`✅ Đã xóa dòng mới nhất thành công!`);
  };

  const handleDeleteFirstRow = async () => {
    // Find first non-deleted row with data
    let firstRowIndex = -1;
    for (let i = 0; i < ROWS; i++) {
      // Skip deleted rows
      if (deletedRows[i]) continue;

      // Check if row has data
      if (dateValues[i] || allTValues[0][i] || allTValues[1][i]) {
        firstRowIndex = i;
        break;
      }
    }

    if (firstRowIndex === -1) {
      alert("⚠️ Không có dòng nào để xóa!");
      setShowDeleteFirstRowModal(false);
      return;
    }

    // Mark first row as deleted
    const newDeletedRows = [...deletedRows];
    newDeletedRows[firstRowIndex] = true;
    setDeletedRows(newDeletedRows);

    // Sync to all Q1-Q10
    setSaveStatus("💾 Đang đồng bộ...");
    const syncPromises = [];
    for (let i = 1; i <= 10; i++) {
      const qId = `q${i}`;
      const result = await loadPageData(qId);
      if (result.success && result.data) {
        syncPromises.push(
          savePageData(
            qId,
            result.data.aValues,
            result.data.bValues,
            result.data.zValues || Array(ROWS).fill(""),
            dateValues,
            newDeletedRows,
            sourceSTTValues,
            0,
            0,
            keepLastNRows,
          ),
        );
      }
    }

    await Promise.all(syncPromises);
    setSaveStatus("✅ Đã xóa dòng đầu tiên và đồng bộ");
    setTimeout(() => setSaveStatus(""), 2000);

    setShowDeleteFirstRowModal(false);
    alert(`✅ Đã xóa dòng đầu tiên!`);
  };

  const clearData = () => {
    setShowDeleteModal(true);
  };

  const handleDelete = () => {
    // Hiện modal xác nhận tương ứng với option đã chọn
    if (deleteOption === "all") {
      setShowDeleteModal(false);
      setShowDeleteAllModal(true);
    } else if (deleteOption === "firstRow") {
      setShowDeleteModal(false);
      setShowDeleteFirstRowModal(true);
    } else if (deleteOption === "lastRow") {
      setShowDeleteModal(false);
      setShowDeleteLastRowModal(true);
    } else if (deleteOption === "dates") {
      if (!deleteDateFrom || !deleteDateTo) {
        alert("⚠️ Vui lòng nhập đầy đủ ngày!");
        return;
      }
      setShowDeleteModal(false);
      setShowDeleteByDatesModal(true);
    } else if (deleteOption === "rows") {
      if (!deleteRowFrom || !deleteRowTo) {
        alert("⚠️ Vui lòng nhập đầy đủ STT dòng!");
        return;
      }
      setShowDeleteModal(false);
      setShowDeleteByRowsModal(true);
    }
  };

  const confirmDeleteAll = async () => {
    try {
      // Xóa tất cả Q1-Q10
      const deletePromises = [];
      for (let i = 1; i <= 10; i++) {
        deletePromises.push(deletePageData(`q${i}`));
      }

      await Promise.all(deletePromises);

      // Reset local state for calculation tables

      setAllTValues(
        Array(TOTAL_TABLES)
          .fill(null)
          .map(() => Array(ROWS).fill("")),
      );
      setAValues(Array(ROWS).fill(""));
      setBValues(Array(ROWS).fill(""));
      setDateValues(Array(ROWS).fill(""));
      setDeletedRows(Array(ROWS).fill(false));
      setAllTableData(
        Array(TOTAL_TABLES)
          .fill(null)
          .map(() => []),
      );
      setIsDataLoaded(false);

      setShowDeleteAllModal(false);
      alert("✅ Đã xóa tất cả dữ liệu Q1-Q10!");

      // Reset form
      setDeleteOption("all");
      setDeleteDateFrom("");
      setDeleteDateTo("");
    } catch (error) {
      alert("⚠️ Lỗi: " + error.message);
    }
  };

  const confirmDeleteByDates = async () => {
    try {
      const newDeletedRows = [...deletedRows];
      let deletedCount = 0;

      // Đánh dấu deleted cho các dòng trong khoảng ngày
      for (let i = 0; i < ROWS; i++) {
        const dateStr = dateValues[i];
        const shouldDelete =
          dateStr && dateStr >= deleteDateFrom && dateStr <= deleteDateTo;

        if (shouldDelete) {
          newDeletedRows[i] = true;
          deletedCount++;
        }
      }

      setDeletedRows(newDeletedRows);

      // Lưu Q hiện tại
      setSaveStatus("💾 Đang lưu...");
      const result = await savePageData(
        pageId,
        aValues,
        bValues,
        zValues,
        dateValues,
        newDeletedRows,
        sourceSTTValues,
        0,
        0,
        keepLastNRows,
      );

      // Sync deletedRows sang Q1-Q10
      for (let i = 1; i <= 10; i++) {
        const qId = `q${i}`;
        if (qId !== pageId) {
          const qResult = await loadPageData(qId);
          if (qResult.success && qResult.data) {
            await savePageData(
              qId,
              qResult.data.aValues,
              qResult.data.bValues,
              qResult.data.zValues || Array(ROWS).fill(""),
              dateValues,
              newDeletedRows,
              sourceSTTValues,
              0,
              0,
              keepLastNRows,
            );
          }
        }
      }

      if (result.success) {
        setSaveStatus("✅ Đã lưu dữ liệu thành công");
        alert(
          `✅ Đã xóa ${deletedCount} dòng từ ${deleteDateFrom} đến ${deleteDateTo} (đồng bộ Q1-Q10)!`,
        );
      } else {
        setSaveStatus("⚠️ Lỗi: " + result.error);
      }

      setTimeout(() => setSaveStatus(""), 2000);
      setShowDeleteByDatesModal(false);

      // Reset form
      setDeleteOption("all");
      setDeleteDateFrom("");
      setDeleteDateTo("");
    } catch (error) {
      alert("⚠️ Lỗi: " + error.message);
    }
  };

  const confirmDeleteByRows = async () => {
    try {
      const from = parseInt(deleteRowFrom);
      const to = parseInt(deleteRowTo);

      if (isNaN(from) || isNaN(to) || from < 0 || to < 0 || from > to) {
        alert("⚠️ STT dòng không hợp lệ!");
        return;
      }

      // Mapping STT hiển thị (visible) sang index thực tế
      const visibleIndices = [];
      for (let i = 0; i < ROWS; i++) {
        if (!deletedRows[i]) {
          visibleIndices.push(i);
        }
      }

      if (from >= visibleIndices.length) {
        alert("⚠️ STT bắt đầu vượt quá số lượng dòng hiện có!");
        return;
      }

      const newDeletedRows = [...deletedRows];
      let deletedCount = 0;

      // Xóa các dòng dựa trên STT hiển thị
      for (
        let vIdx = from;
        vIdx <= Math.min(to, visibleIndices.length - 1);
        vIdx++
      ) {
        const actualIndex = visibleIndices[vIdx];
        newDeletedRows[actualIndex] = true;
        deletedCount++;
      }

      setDeletedRows(newDeletedRows);

      // Lưu Q hiện tại
      setSaveStatus("💾 Đang lưu...");
      const result = await savePageData(
        pageId,
        aValues,
        bValues,
        zValues,
        dateValues,
        newDeletedRows,
        sourceSTTValues,
        0,
        0,
        keepLastNRows,
      );

      // Sync deletedRows sang Q1-Q10
      for (let i = 1; i <= 10; i++) {
        const qId = `q${i}`;
        if (qId !== pageId) {
          const qResult = await loadPageData(qId);
          if (qResult.success && qResult.data) {
            await savePageData(
              qId,
              qResult.data.aValues,
              qResult.data.bValues,
              qResult.data.zValues || Array(ROWS).fill(""),
              dateValues,
              newDeletedRows,
              sourceSTTValues,
              0,
              0,
              keepLastNRows,
            );
          }
        }
      }

      if (result.success) {
        setSaveStatus("✅ Đã lưu dữ liệu thành công");
        alert(
          `✅ Đã xóa ${deletedCount} dòng từ STT ${from} đến ${to} (đồng bộ Q1-Q10)!`,
        );
      } else {
        setSaveStatus("⚠️ Lỗi: " + result.error);
      }

      setTimeout(() => setSaveStatus(""), 2000);
      setShowDeleteByRowsModal(false);

      // Reset form
      setDeleteOption("all");
      setDeleteRowFrom("");
      setDeleteRowTo("");
    } catch (error) {
      alert("⚠️ Lỗi: " + error.message);
    }
  };

  // Handle save keep last N rows settings
  const handleSaveKeepLastNRows = async () => {
    try {
      // Validate input
      const n = parseInt(tempKeepLastNRows);

      if (!n || n <= 0) {
        alert("⚠️ Vui lòng nhập số dòng hợp lệ (lớn hơn 0)!");
        return;
      }

      // Set loading state
      setIsSavingKeepLastNRows(true);

      // Update state
      setKeepLastNRows(n);

      // Sync the setting to all Q1-Q10
      setSaveStatus("💾 Đang đồng bộ...");
      const syncPromises = [];
      for (let i = 1; i <= 10; i++) {
        const qId = `q${i}`;
        const result = await loadPageData(qId);
        if (result.success && result.data) {
          syncPromises.push(
            savePageData(
              qId,
              result.data.aValues,
              result.data.bValues,
              result.data.zValues || Array(ROWS).fill(""),
              result.data.dateValues || dateValues,
              result.data.deletedRows || deletedRows,
              result.data.sourceSTTValues || Array(ROWS).fill(""),
              0,
              0,
              n,
            ),
          );
        }
      }

      await Promise.all(syncPromises);
      setSaveStatus("✅ Đã lưu cài đặt dòng đã toán");

      // Close modal
      setShowKeepLastNRowsSettingsModal(false);

      // Ask to apply immediately
      if (
        confirm(
          `✅ Đã lưu cài đặt: ${n} dòng tồn tại.\n\nBạn có muốn thực hiện xóa các dòng cũ để CHỈ GIỮ LẠI ${n} dòng cuối cùng ngay bây giờ không?`,
        )
      ) {
        await applyKeepLastNRows(n);
      }
    } catch (error) {
      console.error("Error saving keep last N rows:", error);
      alert("⚠️ Lỗi khi lưu cài đặt: " + error.message);
      setSaveStatus("⚠️ Lỗi khi lưu");
      setTimeout(() => setSaveStatus(""), 2000);
    } finally {
      setIsSavingKeepLastNRows(false);
    }
  };

  return (
    <div className="app-container-full">
      {/* PMA Title */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          borderBottom: "2px solid #dee2e6",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            fontStyle: "italic",
            margin: "0",
            color: "#cf3535ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "15px",
          }}
        >
          {/* Nhãn phân biệt Web đã chuyển xuống Toolbar */}
          Dự án cải tạo môi trường thềm lục địa biển Việt Nam -
          <span
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#cf3535ff",
              fontStyle: "italic",
              marginLeft: "8px",
            }}
          >
            Mai Kiên - SĐT: 0964636709, email: maikien06091966@gmail.com
          </span>
        </h1>
      </div>
      {/* Top Toolbar - Chứa tất cả controls */}
      <div className="top-toolbar">
        <div className="toolbar-section">
          {/* Action Buttons */}
          <div
            className="toolbar-group"
            style={{
              border: "3px solid #28a745",
              borderRadius: "8px",
              padding: "10px 15px",
              backgroundColor: "#e8f5e9",
            }}
          >
            {/* <button
              onClick={handleAddRow}
              className="toolbar-button success"
              style={{ marginLeft: "10px", marginRight: "18px" }}
            >
              ➕ Thêm
            </button> */}
            <button
              className="toolbar-button"
              disabled
              style={{
                fontSize: "22px",
                fontWeight: "bold",
                backgroundColor: "#ffc107",
                color: "#000",
                cursor: "default",
                opacity: 1,
                border: "none",
                padding: "6px 12px",
                borderRadius: "8px",
                marginRight: "10px",
              }}
            >
              Bảng tính - APP {import.meta.env.VITE_APP_NAME}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="toolbar-button danger"
              title="Cài đặt xóa dữ liệu các bảng tính Q1-Q10"
            >
              🗑️ Xóa dữ liệu
            </button>
            <button onClick={clearColumnHighlights} className="toolbar-button">
              🔄 X màu d.c
            </button>
            <button onClick={handleSaveData} className="toolbar-button success">
              💾 Lưu dữ liệu
            </button>
          </div>

          {/* Dòng tồn tại Control */}
          <div
            className="toolbar-group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "3px solid #007bff",
              borderRadius: "8px",
              padding: "10px 15px",
              backgroundColor: "#e7f3ff",
            }}
          >
            <label style={{ fontSize: "25px", fontWeight: "bold" }}>
              📊 Dòng tồn tại:
            </label>
            <span
              style={{
                fontSize: "25px",
                fontWeight: "600",
                color: "#333",
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "2px solid #007bff",
                borderRadius: "4px",
                minWidth: "80px",
                textAlign: "center",
              }}
            >
              {keepLastNRows || 0}
            </span>
            <button
              onClick={() => {
                setTempKeepLastNRows(keepLastNRows);
                setShowKeepLastNRowsSettingsModal(true);
              }}
              className="toolbar-button"
              style={{
                fontSize: "18px",
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              title="Cài đặt số dòng tồn tại"
            >
              ⚙️
            </button>
          </div>

          <div
            className="toolbar-group"
            style={{
              display: "flex",
              alignItems: "center",
              border: "3px solid #007bff",
              borderRadius: "8px",
              padding: "8px 12px",
              backgroundColor: "#e7f3ff",
            }}
          >
            <button
              onClick={handleInputAllQ}
              className="toolbar-button primary"
              style={{
                fontSize: "25px",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              📥 Về Bảng thông để chọn dòng thông
            </button>
          </div>

          {/* Q Navigation Buttons */}
          <div
            className="toolbar-group"
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            {/* <label style={{ fontSize: "35px", fontWeight: "bold" }}>Q:</label> */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const qId = `q${num}`;
              const isActive = pageId === qId;

              return (
                <button
                  key={num}
                  onClick={() => {
                    window.location.pathname = `/${qId}`;
                  }}
                  className="toolbar-button"
                  style={{
                    backgroundColor: isActive ? "#4a90e2" : "#ffffff",
                    color: isActive ? "white" : "#333",
                    fontWeight: isActive ? "bold" : "normal",
                    border: isActive
                      ? "3px solid #4a90e2"
                      : "1px solid #d0d0d0",
                    padding: "6px 12px",
                    fontSize: "30px",
                    minWidth: "60px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Q{num}
                </button>
              );
            })}
          </div>

          {/* Status Messages */}
          <div className="toolbar-group">
            {isLoading && (
              <span className="status-loading">⏳ Đang tải...</span>
            )}
            {!isLoading && saveStatus && (
              <span className="status-success">{saveStatus}</span>
            )}
            {error && <span className="status-error">{error}</span>}
          </div>
          {/* Go To Table */}
          <div
            className="toolbar-group"
            style={{
              marginLeft: "12px",
              border: "3px solid #28a745",
              borderRadius: "8px",
              padding: "5px 12px",
              backgroundColor: "#e8f5e9",
            }}
          >
            {/* <label style={{ fontSize: "18px", fontWeight: "bold" }}>Xem:</label> */}
            <input
              type="number"
              value={goToTableNumber}
              onChange={(e) => setGoToTableNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleGoToTable();
                }
              }}
              min="1"
              max={TOTAL_TABLES}
              style={{
                width: "80px",
                padding: "8px",
                fontSize: "18px",
                border: "2px solid #28a745",
                borderRadius: "4px",
                textAlign: "center",
              }}
            />
            <button
              onClick={handleGoToTable}
              className="toolbar-button primary"
              style={{ fontSize: "18px", padding: "8px 16px" }}
            >
              Xem
            </button>
            <button
              className="toolbar-button"
              style={{
                fontSize: "18px",
                padding: "8px 16px",
                backgroundColor: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "default",
                marginLeft: "8px",
                fontWeight: "bold",
              }}
              title="Tổng số dòng đã được tính toán (không bao gồm dòng tương lai)"
            >
              📊 Dòng đã toán:{" "}
              {allTableData[0]
                ? allTableData[0].filter((_, i) => !deletedRows[i]).length
                : 0}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Tables */}
      <div className="main-content">
        {isGenerating && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Đang tính toán {allTableData.length} bảng...</p>
            </div>
          </div>
        )}

        <div className="tables-container">
          <div className="table-section unified-table-section">
            <div
              className="data-grid-wrapper"
              ref={(el) => (tableRefs.current[0] = el)}
              onScroll={(e) => handleSyncScroll(e, 0)}
            >
              {allTableData.length > 0 ? (
                <table className="data-grid unified-table">
                  <thead>
                    <tr>
                      <th colSpan="3" className="group-header sticky-col">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                          }}
                        >
                          <span>Q{pageId.replace("q", "").toUpperCase()}</span>
                          <input
                            type="text"
                            value={pageLabel}
                            onChange={(e) => setPageLabel(e.target.value)}
                            placeholder="..."
                            title="Nhập thêm ghi chú sau tên Q"
                            style={{
                              background: "rgba(111, 66, 193, 0.05)",
                              border: "none",
                              borderBottom: "2px solid #6f42c1",
                              color: "#6f42c1",
                              fontSize: "24px",
                              fontWeight: "bold",
                              textAlign: "left",
                              width: "150px",
                              padding: "2px 8px",
                              outline: "none",
                              borderRadius: "4px",
                              fontStyle: "italic",
                            }}
                          />
                        </div>
                      </th>
                      <th
                        colSpan="1"
                        className={`group-header${highlightedAColumn ? " col-header-yellow" : ""}`}
                        onClick={handleAColClick}
                        style={{ cursor: "pointer" }}
                      >
                        A
                      </th>
                      <th
                        colSpan="1"
                        className={`group-header${highlightedBColumn ? " col-header-yellow" : ""}`}
                        onClick={handleBColClick}
                        style={{ cursor: "pointer" }}
                      >
                        B
                      </th>
                      {allTableData.map((_, tableIndex) => (
                        <th
                          key={tableIndex}
                          colSpan="1"
                          className={`group-header${highlightedTColumns[tableIndex] ? " col-header-yellow" : ""}`}
                          onClick={() => handleTColClick(tableIndex)}
                          style={{ cursor: "pointer" }}
                        >
                          T{tableIndex + 1}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="col-header fixed sticky-col stt-col">
                        STT
                      </th>
                      <th
                        className="col-header fixed date-col-header sticky-col date-col"
                        style={{ minWidth: "190px", width: "190px" }}
                      >
                        Ngày
                      </th>
                      <th
                        className="col-header fixed sticky-col dt-col"
                        style={{ minWidth: "150px", width: "150px" }}
                      >
                        STT_D.T
                      </th>
                      <th
                        className={`col-header fixed${highlightedAColumn ? " col-header-yellow" : ""}`}
                        onClick={handleAColClick}
                        style={{ cursor: "pointer" }}
                      >
                        A
                      </th>
                      <th
                        className={`col-header fixed${highlightedBColumn ? " col-header-yellow" : ""}`}
                        onClick={handleBColClick}
                        style={{ cursor: "pointer" }}
                      >
                        B
                      </th>
                      {allTableData.map((_, tableIndex) => (
                        <th
                          key={tableIndex}
                          className={`col-header fixed${highlightedTColumns[tableIndex] ? " col-header-yellow" : ""}`}
                          onClick={() => handleTColClick(tableIndex)}
                          style={{ cursor: "pointer" }}
                        >
                          T{tableIndex + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let displayRowNumber = -1;
                      // Use the first table's data length to map rows
                      return allTableData[0].map((_, rowIndex) => {
                        if (deletedRows[rowIndex]) return null;
                        displayRowNumber++;

                        return (
                          <tr key={rowIndex}>
                            <td
                              className={`data-cell fixed sticky-col stt-col ${
                                highlightedRows[rowIndex] ? "highlighted-row" : ""
                              }`}
                              onClick={() => handleRowClick(rowIndex)}
                              style={{ cursor: "pointer" }}
                            >
                              {String(displayRowNumber).padStart(3, "0")}
                            </td>
                            <td
                              className={`data-cell fixed date-col sticky-col ${
                                highlightedRows[rowIndex] ? "highlighted-row" : ""
                              }`}
                              onClick={() => handleRowClick(rowIndex)}
                              style={{ cursor: "pointer" }}
                            >
                              <input
                                type="date"
                                className="date-input"
                                value={dateValues[rowIndex] || ""}
                                style={{ pointerEvents: "none" }}
                                readOnly
                              />
                            </td>
                            <td
                              className={`data-cell fixed sticky-col dt-col ${
                                highlightedRows[rowIndex] ? "highlighted-row" : ""
                              }`}
                              style={{ minWidth: "150px", width: "150px" }}
                            >
                              <input
                                type="text"
                                className="grid-input"
                                value={sourceSTTValues[rowIndex] || ""}
                                readOnly={true}
                                style={{ color: "#6f42c1", fontWeight: "bold" }}
                              />
                            </td>
                            <td
                              className={`data-cell fixed ${
                                highlightedACells[rowIndex]
                                  ? "highlighted-t-cell"
                                  : highlightedAColumn
                                    ? "highlighted-t-yellow"
                                    : highlightedRows[rowIndex]
                                      ? "highlighted-row"
                                      : ""
                              }`}
                              onClick={() => handleACellClick(rowIndex)}
                            >
                              <input
                                type="text"
                                className="grid-input"
                                value={aValues[rowIndex] || ""}
                                readOnly={true}
                                style={{
                                  color: highlightedACells[rowIndex]
                                    ? "white"
                                    : "#ef4444",
                                }}
                              />
                            </td>
                            <td
                              className={`data-cell fixed ${
                                highlightedBCells[rowIndex]
                                  ? "highlighted-t-cell"
                                  : highlightedBColumn
                                    ? "highlighted-t-yellow"
                                    : highlightedRows[rowIndex]
                                      ? "highlighted-row"
                                      : ""
                              }`}
                              onClick={() => handleBCellClick(rowIndex)}
                            >
                              <input
                                type="text"
                                className="grid-input"
                                value={bValues[rowIndex] || ""}
                                readOnly={true}
                                style={{
                                  color: highlightedBCells[rowIndex]
                                    ? "white"
                                    : "#ef4444",
                                }}
                              />
                            </td>
                            {allTableData.map((tableData, tableIndex) => {
                              const tValue = allTValues[tableIndex][rowIndex];
                              return (
                                <td
                                  key={tableIndex}
                                  className={`data-cell fixed ${
                                    highlightedTCells[tableIndex]?.[rowIndex]
                                      ? "highlighted-t-cell"
                                      : highlightedTColumns[tableIndex]
                                        ? "highlighted-t-yellow"
                                        : highlightedRows[rowIndex]
                                          ? "highlighted-row"
                                          : ""
                                  }`}
                                  onClick={() =>
                                    handleTCellClick(tableIndex, rowIndex)
                                  }
                                >
                                  <input
                                    type="text"
                                    className="grid-input"
                                    value={tValue}
                                    readOnly={true}
                                    style={{
                                      pointerEvents: "none",
                                      color: "inherit",
                                    }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>

                </table>
              ) : (
                <div className="empty-message">Đang tính toán T1-T80...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "90%" }}
          >
            <h3 style={{ fontSize: "24px" }}>Xóa dữ liệu</h3>

            <div className="modal-body">
              <div className="radio-group">
                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="all"
                    checked={deleteOption === "all"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa tất cả dữ liệu
                </label>

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="firstRow"
                    checked={deleteOption === "firstRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa dòng cũ nhất
                </label>

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="lastRow"
                    checked={deleteOption === "lastRow"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa dòng mới nhất
                </label>

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="dates"
                    checked={deleteOption === "dates"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa theo khoảng ngày
                </label>

                {deleteOption === "dates" && (
                  <div
                    className="input-row"
                    style={{
                      marginTop: "16px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="date"
                      value={deleteDateFrom}
                      onChange={(e) => setDeleteDateFrom(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                      đến
                    </span>
                    <input
                      type="date"
                      value={deleteDateTo}
                      onChange={(e) => setDeleteDateTo(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                  </div>
                )}

                <label
                  style={{
                    fontSize: "35px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="radio"
                    value="rows"
                    checked={deleteOption === "rows"}
                    onChange={(e) => setDeleteOption(e.target.value)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  Xóa theo khoảng STT dòng
                </label>

                {deleteOption === "rows" && (
                  <div
                    className="input-row"
                    style={{
                      marginTop: "16px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="number"
                      placeholder="STT từ"
                      value={deleteRowFrom}
                      onChange={(e) => setDeleteRowFrom(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                      đến
                    </span>
                    <input
                      type="number"
                      placeholder="STT đến"
                      value={deleteRowTo}
                      onChange={(e) => setDeleteRowTo(e.target.value)}
                      style={{
                        padding: "12px",
                        fontSize: "18px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        flex: 1,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={handleDelete}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {showAddRowModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "600px", width: "90%" }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>➕ Thêm hàng mới</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Chọn ngày (ngày/tháng/năm):
                </label>
                <input
                  type="date"
                  value={newRowDate}
                  onChange={(e) => setNewRowDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "18px",
                    border: "2px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: "20px" }}>
                <label
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  A (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={newRowT1}
                  onChange={(e) => setNewRowT1(e.target.value)}
                  placeholder="Nhập A"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "18px",
                    border: "2px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: "20px" }}>
                <label
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  B (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={newRowT2}
                  onChange={(e) => setNewRowT2(e.target.value)}
                  placeholder="Nhập B"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "18px",
                    border: "2px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddRowModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmAddRow}
                disabled={isAddingRow}
                style={{
                  background: isAddingRow ? "#6c757d" : "#28a745",
                  fontSize: "18px",
                  padding: "12px 24px",
                  cursor: isAddingRow ? "not-allowed" : "pointer",
                  opacity: isAddingRow ? 0.7 : 1,
                }}
              >
                {isAddingRow ? "Đang thêm..." : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete First Row Confirmation Modal */}
      {showDeleteFirstRowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚠️ Xác nhận xóa dòng</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa dòng đầu tiên hiện tại không?
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteFirstRowModal(false)}
              >
                Hủy
              </button>
              <button className="btn-delete" onClick={handleDeleteFirstRow}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Last Row Confirmation Modal */}
      {showDeleteLastRowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚠️ Xác nhận xóa dòng</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa dòng cuối cùng (dòng mới nhất) hiện
                tại không?
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteLastRowModal(false)}
              >
                Hủy
              </button>
              <button className="btn-delete" onClick={handleDeleteLastRow}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keep Last N Rows Confirmation Modal */}
      {showKeepLastNRowsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn chỉ giữ lại{" "}
                <strong>{keepLastNRows}</strong> dòng cuối cùng?
                <br />
                <br />
                Tất cả các dòng khác sẽ bị xóa!
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowKeepLastNRowsModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={() => {
                  handleKeepLastNRows();
                  setShowKeepLastNRowsModal(false);
                  setShowSettingsModal(false);
                }}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận xóa tất cả</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> dữ liệu
                Q1-Q10?
                <br />
                <br />
                <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                  Hành động này không thể hoàn tác!
                </span>
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteAllModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmDeleteAll}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete By Dates Confirmation Modal */}
      {showDeleteByDatesModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận xóa theo ngày</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa các dòng từ:
                <br />
                <br />
                <strong style={{ fontSize: "20px", color: "#dc3545" }}>
                  {deleteDateFrom} đến {deleteDateTo}
                </strong>
                <br />
                <br />
                Dữ liệu sẽ được đồng bộ xóa trên tất cả Q1-Q10!
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteByDatesModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmDeleteByDates}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete By Rows Confirmation Modal */}
      {showDeleteByRowsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "24px" }}>⚠️ Xác nhận xóa theo dòng</h3>
            </div>

            <div className="modal-body">
              <p
                style={{
                  fontSize: "18px",
                  textAlign: "center",
                  margin: "20px 0",
                }}
              >
                Bạn có chắc chắn muốn xóa các dòng từ STT:
                <br />
                <br />
                <strong style={{ fontSize: "20px", color: "#dc3545" }}>
                  {deleteRowFrom} đến {deleteRowTo}
                </strong>
                <br />
                <br />
                Dữ liệu sẽ được đồng bộ xóa trên tất cả Q1-Q10!
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteByRowsModal(false)}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={confirmDeleteByRows}
                style={{ fontSize: "18px", padding: "12px 24px" }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keep Last N Rows Settings Modal */}
      {showKeepLastNRowsSettingsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowKeepLastNRowsSettingsModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px", width: "90%" }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: "35px" }}>⚙️ Cài đặt số dòng tồn tại</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label
                  style={{
                    fontSize: "35px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Số dòng:
                </label>
                <input
                  type="number"
                  value={tempKeepLastNRows}
                  onChange={(e) => setTempKeepLastNRows(e.target.value)}
                  placeholder="Nhập số dòng tồn tại"
                  min="1"
                  max={ROWS}
                  disabled={isSavingKeepLastNRows}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "35px",
                    border: "2px solid #007bff",
                    borderRadius: "6px",
                    textAlign: "center",
                    cursor: isSavingKeepLastNRows ? "not-allowed" : "text",
                    opacity: isSavingKeepLastNRows ? 0.6 : 1,
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: "20px",
                  padding: "12px",
                  backgroundColor: "#d1ecf1",
                  border: "1px solid #007bff",
                  borderRadius: "6px",
                  fontSize: "16px",
                  color: "#0c5460",
                }}
              >
                💡 <strong>Lưu ý:</strong> Đây là số dòng tối đa được lưu trữ
                trong hệ thống.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowKeepLastNRowsSettingsModal(false)}
                disabled={isSavingKeepLastNRows}
                style={{
                  fontSize: "18px",
                  padding: "12px 24px",
                  cursor: isSavingKeepLastNRows ? "not-allowed" : "pointer",
                  opacity: isSavingKeepLastNRows ? 0.6 : 1,
                }}
              >
                Hủy
              </button>
              <button
                className="btn-delete"
                onClick={handleSaveKeepLastNRows}
                disabled={isSavingKeepLastNRows}
                style={{
                  fontSize: "18px",
                  padding: "12px 24px",
                  backgroundColor: isSavingKeepLastNRows
                    ? "#6c757d"
                    : "#28a745",
                  cursor: isSavingKeepLastNRows ? "not-allowed" : "pointer",
                  opacity: isSavingKeepLastNRows ? 0.7 : 1,
                }}
              >
                {isSavingKeepLastNRows ? "⏳ Đang lưu..." : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
