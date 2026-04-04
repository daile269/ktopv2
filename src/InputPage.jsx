import { useState, useEffect, useMemo, memo, useCallback } from "react";
import "./App.css";
import "./InputPage.css";
import { savePageData, loadPageData } from "./dataService";

const TaskRow = memo(
  ({
    rowIndex,
    displayRowNumber,
    isDeleted,
    isSelected,
    zValue,
    allQData,
    onToggleSelect,
    onZChange,
    onAChange,
    onBChange,
  }) => {
    return (
      <tr className={isSelected ? "selected-draft-row" : ""}>
        <td
          style={{
            textAlign: "center",
            width: "80px !important",
            minWidth: "80px !important",
            padding: 0,
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(rowIndex)}
            disabled={isDeleted}
            style={{
              transform: "scale(2.2)",
              cursor: "pointer",
            }}
          />
        </td>
        <td style={{ textAlign: "center", fontSize: "20px" }}>
          {String(displayRowNumber).padStart(3, "0")}
        </td>
        <td>
          <input
            type="text"
            className="cell-input"
            maxLength={6}
            value={isDeleted ? "" : zValue || ""}
            onChange={(e) => onZChange(rowIndex, e.target.value)}
            disabled={isDeleted}
            style={{
              textAlign: "center",
              width: "100%",
              padding: "8px",
              fontSize: "20px",
              fontWeight: "bold",
            }}
          />
        </td>
        {/* Ngày đã bị loại bỏ */}
        {Array.from({ length: 10 }).map((_, qIndex) => {
          const qData = allQData[qIndex];
          const aV = isDeleted ? "" : qData?.aValues[rowIndex] || "";
          const bV = isDeleted ? "" : qData?.bValues[rowIndex] || "";
          const color = qIndex % 2 === 0 ? "#fff" : "#f1f1f1";

          return (
            <span key={qIndex} style={{ display: "contents" }}>
              <td
                style={{
                  backgroundColor: color,
                  borderRight: "2px solid #999",
                }}
              >
                <input
                  type="text"
                  className="cell-input small"
                  value={aV}
                  onChange={(e) => onAChange(qIndex, rowIndex, e.target.value)}
                  disabled={isDeleted}
                />
              </td>
              <td
                style={{
                  backgroundColor: color,
                  borderRight: "2px solid red",
                }}
              >
                <input
                  type="text"
                  className="cell-input small"
                  value={bV}
                  onChange={(e) => onBChange(qIndex, rowIndex, e.target.value)}
                  disabled={isDeleted}
                />
              </td>
            </span>
          );
        })}
      </tr>
    );
  },
);

function InputPage() {
  const MIN_ROWS = 125; // Minimum rows
  const [keepLastNRows, setKeepLastNRows] = useState(125);
  const ROWS = Math.max(MIN_ROWS, keepLastNRows); // Dynamic: min 125, or larger from DB

  // State cho A, B của 10Q
  const [allQData, setAllQData] = useState(
    Array(10)
      .fill(null)
      .map(() => ({
        aValues: Array(ROWS).fill(""),
        bValues: Array(ROWS).fill(""),
      })),
  );

  const [dateValues, setDateValues] = useState(Array(ROWS).fill(""));
  const [zValues, setZValues] = useState(Array(ROWS).fill(""));
  const [deletedRows, setDeletedRows] = useState(Array(ROWS).fill(false));
  const [purpleRangeFrom, setPurpleRangeFrom] = useState(0);
  const [purpleRangeTo, setPurpleRangeTo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedRows, setSelectedRows] = useState({}); // { rowIndex: true }
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingToCalc, setIsAddingToCalc] = useState(false);
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Load data từ master_draft
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const result = await loadPageData("master_draft");

      if (result.success && result.data) {
        const d = result.data;
        setAllQData(
          d.allQData ||
            Array(10)
              .fill(null)
              .map(() => ({
                aValues: Array(ROWS).fill(""),
                bValues: Array(ROWS).fill(""),
              })),
        );
        setDateValues(d.dateValues || Array(ROWS).fill(""));
        setZValues(d.zValues || Array(ROWS).fill(""));
        setDeletedRows(d.deletedRows || Array(ROWS).fill(false));
        setKeepLastNRows(d.keepLastNRows || 125);
        setPurpleRangeFrom(d.purpleRangeFrom || 0);
        setPurpleRangeTo(d.purpleRangeTo || 0);
      } else {
        // Khởi tạo bảng trống nếu chưa có master_draft
        setAllQData(
          Array(10)
            .fill(null)
            .map(() => ({
              aValues: Array(ROWS).fill(""),
              bValues: Array(ROWS).fill(""),
            })),
        );
        setDateValues(Array(ROWS).fill(""));
        setZValues(Array(ROWS).fill(""));
        setDeletedRows(Array(ROWS).fill(false));
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Auto scroll to last row with data
  useEffect(() => {
    if (!isLoading && dateValues.length > 0) {
      // Tìm dòng cuối cùng có dữ liệu (ngày hoặc T1/T2 của bất kỳ Q nào) và chưa xóa
      let lastDataRowIndex = -1;
      for (let i = dateValues.length - 1; i >= 0; i--) {
        // Bỏ qua dòng đã xóa
        if (deletedRows[i]) continue;

        // Kiểm tra xem dòng này có dữ liệu không (ngày hoặc T1/T2 của bất kỳ Q nào)
        let hasData =
          dateValues[i] !== "" &&
          dateValues[i] !== null &&
          dateValues[i] !== undefined;

        // Nếu chưa có ngày, kiểm tra A/B của tất cả Q
        if (!hasData) {
          for (let qIndex = 0; qIndex < 10; qIndex++) {
            const a = allQData[qIndex]?.aValues[i];
            const b = allQData[qIndex]?.bValues[i];
            const z = zValues[i];
            if ((a && a !== "") || (b && b !== "") || (z && z !== "")) {
              hasData = true;
              break;
            }
          }
        }

        if (hasData) {
          lastDataRowIndex = i;
          break;
        }
      }

      if (lastDataRowIndex >= 0) {
        // Delay để đảm bảo DOM đã render xong
        setTimeout(() => {
          // Tính vị trí của dòng này trong bảng đã sort
          // Đếm số dòng chưa xóa trước dòng này
          let displayRowNumber = 0;
          for (let i = 0; i < dateValues.length; i++) {
            if (!deletedRows[i]) {
              displayRowNumber++;
              if (i === lastDataRowIndex) break;
            }
          }

          // Scroll đến dòng này (+2 vì có 2 header rows)
          const displayRowNumberLocal = displayRowNumber; // local copy
          const rowElement = document.querySelector(
            `tbody tr:nth-child(${displayRowNumber - 1})`, // +1 để scroll xuống thêm 1 dòng
          );

          if (rowElement) {
            rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            // Fallback: scroll container xuống 80%
            const tableContainer =
              document.querySelector(".schedule-table")?.parentElement;
            if (tableContainer) {
              const scrollPosition = tableContainer.scrollHeight * 0.8;
              tableContainer.scrollTo({
                top: scrollPosition,
                behavior: "smooth",
              });
            }
          }
        }, 500);
      }
    }
  }, [isLoading]);

  // Keep last N rows - hide all rows except last N rows with data
  const handleKeepLastNRows = async () => {
    const n = parseInt(keepLastNRows);

    if (!n || n <= 0) {
      alert("⚠️ Vui lòng nhập số dòng hợp lệ (> 0)");
      return;
    }

    const nonDeletedRowsWithData = [];
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) {
        let hasData =
          dateValues[i] !== "" &&
          dateValues[i] !== null &&
          dateValues[i] !== undefined;

        if (!hasData) {
          for (let qIndex = 0; qIndex < 10; qIndex++) {
            const a = allQData[qIndex]?.aValues[i];
            const b = allQData[qIndex]?.bValues[i];
            const z = zValues[i];
            if ((a && a !== "") || (b && b !== "") || (z && z !== "")) {
              hasData = true;
              break;
            }
          }
        }

        if (hasData) {
          nonDeletedRowsWithData.push(i);
        }
      }
    }

    if (nonDeletedRowsWithData.length === 0) {
      alert("⚠️ Không có dòng nào có dữ liệu (chưa xóa)!");
      return;
    }

    if (
      !confirm(
        `⚠️ Bạn có chắc muốn chỉ giữ lại ${n} dòng cuối cùng? Các dòng khác sẽ bị xóa.`,
      )
    ) {
      return;
    }

    // Keep only last N rows from non-deleted rows
    const rowsToKeep = nonDeletedRowsWithData.slice(-n);

    // Update deletedRows
    const newDeletedRows = [...deletedRows];
    for (let i = 0; i < dateValues.length; i++) {
      if (!deletedRows[i]) {
        if (!rowsToKeep.includes(i)) {
          newDeletedRows[i] = true;
        }
      }
    }

    setDeletedRows(newDeletedRows);

    // Save automatically
    setSaveStatus("💾 Đang lưu...");
    await savePageData(
      "master_draft",
      null,
      null,
      zValues,
      dateValues,
      newDeletedRows,
      purpleRangeFrom,
      purpleRangeTo,
      n,
      allQData,
    );
    setSaveStatus("✅ Đã giữ " + n + " dòng cuối!");
    alert(`✅ Đã thực hiện giữ lại ${n} dòng cuối cùng!`);
    setTimeout(() => setSaveStatus(""), 2000);
  };

  const handleSave = async () => {
    setSaveStatus("💾 Đang lưu...");
    const result = await savePageData(
      "master_draft",
      null, // Not used directly in draft
      null,
      zValues,
      dateValues,
      deletedRows,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData, // Truyền allQData
    );

    if (result.success) {
      setSaveStatus("✅ Đã lưu Master!");
      alert("✅ Đã lưu dữ liệu bảng thông thành công!");
    } else {
      setSaveStatus("⚠️ Lỗi!");
      alert("⚠️ Lỗi khi lưu vào Master: " + (result.error || "Không xác định"));
    }
    setTimeout(() => setSaveStatus(""), 2000);
  };

  // Helper function to format date to DD/MM/YYYY
  // formatDateSimple removed

  const handleToggleSelect = useCallback((rowIndex) => {
    setSelectedRows((prev) => {
      const next = { ...prev };
      if (next[rowIndex]) delete next[rowIndex];
      else next[rowIndex] = true;
      return next;
    });
  }, []);

  const handleZChange = useCallback((rIdx, val) => {
    const v = val.replace(/[^0-9]/g, "");
    if (v.length <= 6) {
      setZValues((prev) => {
        const next = [...prev];
        next[rIdx] = v;
        return next;
      });
    }
  }, []);

  // Date change has been removed

  const handleAChange = useCallback((qIdx, rIdx, val) => {
    setAllQData((prev) => {
      const next = [...prev];
      // Deep clone only the affected Q
      const updatedQ = {
        ...next[qIdx],
        aValues: [...next[qIdx].aValues],
      };
      updatedQ.aValues[rIdx] = val;
      next[qIdx] = updatedQ;
      return next;
    });
  }, []);

  const handleBChange = useCallback((qIdx, rIdx, val) => {
    setAllQData((prev) => {
      const next = [...prev];
      // Deep clone only the affected Q
      const updatedQ = {
        ...next[qIdx],
        bValues: [...next[qIdx].bValues],
      };
      updatedQ.bValues[rIdx] = val;
      next[qIdx] = updatedQ;
      return next;
    });
  }, []);

  const handleConfirmAddToApp = async () => {
    const selectedIndices = Object.keys(selectedRows)
      .map(Number)
      .sort((a, b) => a - b);
    if (selectedIndices.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một dòng!");
      return;
    }

    setIsAddingToCalc(true);
    setSaveStatus("🚀 Đang thêm dòng vào bảng tính...");

    try {
      for (let i = 1; i <= 10; i++) {
        const qId = `q${i}`;
        const currentData = await loadPageData(qId);
        let activeA = [],
          activeB = [],
          activeZ = [],
          activeD = [],
          activeDel = [];

        if (currentData.success && currentData.data) {
          activeA = currentData.data.aValues || [];
          activeB = currentData.data.bValues || [];
          activeZ = currentData.data.zValues || [];
          activeD = currentData.data.dateValues || [];
          activeDel = currentData.data.deletedRows || [];
        } else {
          activeA = Array(125).fill("");
          activeB = Array(125).fill("");
          activeZ = Array(125).fill("");
          activeD = Array(125).fill("");
          activeDel = Array(125).fill(true);
        }

        // Append selected rows
        selectedIndices.forEach((idx) => {
          activeA.push(allQData[i - 1].aValues[idx]);
          activeB.push(allQData[i - 1].bValues[idx]);
          activeZ.push(zValues[idx]);
          activeD.push(transferDate);
          activeDel.push(false);
        });

        // Keep last 125
        if (activeA.length > 125) {
          activeA = activeA.slice(-125);
          activeB = activeB.slice(-125);
          activeZ = activeZ.slice(-125);
          activeD = activeD.slice(-125);
          activeDel = activeDel.slice(-125);
        } else {
          // Pad back to 125 if needed
          while (activeA.length < 125) {
            activeA.unshift("");
            activeB.unshift("");
            activeZ.unshift("");
            activeD.unshift("");
            activeDel.unshift(true);
          }
        }

        await savePageData(
          qId,
          activeA,
          activeB,
          activeZ,
          activeD,
          activeDel,
          purpleRangeFrom,
          purpleRangeTo,
          125,
        );
      }

      setSaveStatus("✅ Đã thêm mới vào bảng tính!");
      alert(`✅ Đã thêm ${selectedIndices.length} dòng thành công!`);
      setSelectedRows({});
      setShowAddModal(false);
    } catch (err) {
      alert("⚠️ Lỗi trong quá trình thêm!");
    } finally {
      setIsAddingToCalc(false);
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const sortedIndices = useMemo(() => {
    return Array.from(
      { length: dateValues.length || MIN_ROWS },
      (_, i) => i,
    ).sort((a, b) => {
      const aDeleted = deletedRows[a] || false;
      const bDeleted = deletedRows[b] || false;
      if (aDeleted === bDeleted) return a - b;
      return aDeleted ? 1 : -1;
    });
  }, [dateValues.length, deletedRows]);

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      {/* PMA Title */}
      <div
        style={{
          position: "sticky",
          top: 0,
          width: "100%",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          borderBottom: "2px solid #dee2e6",
          zIndex: 100,
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
          {/* Nhãn phân biệt Web */}
          {import.meta.env.VITE_SITE_ID && (
            <span
              style={{
                fontSize: "16px",
                padding: "4px 12px",
                borderRadius: "20px",
                backgroundColor:
                  import.meta.env.VITE_SITE_ID === "site_a"
                    ? "#007bff"
                    : "#6c757d",
                color: "white",
                fontStyle: "normal",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              APP: {import.meta.env.VITE_SITE_ID === "site_a" ? "A" : "B"}
            </span>
          )}
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
      <div className="app-container">
        <div style={{ width: "100%", padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "20px",
              marginTop: "20px",
            }}
          >
            {/* <div
              style={{
                padding: "12px 20px",
                background: "#f9f9f9",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <label
                style={{ fontSize: "30px", fontWeight: "600", color: "#555" }}
              >
                Nhập khoảng số muốn báo màu:
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={purpleRangeFrom}
                onChange={(e) =>
                  setPurpleRangeFrom(parseInt(e.target.value) || 0)
                }
                style={{
                  width: "100px",
                  padding: "4px 8px",
                  fontSize: "30px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: "30px", color: "#666" }}>đến</span>
              <input
                type="number"
                min="0"
                max="1000"
                value={purpleRangeTo}
                onChange={(e) =>
                  setPurpleRangeTo(parseInt(e.target.value) || 0)
                }
                style={{
                  width: "100px",
                  padding: "4px 8px",
                  fontSize: "30px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              />
            </div> */}
            {/* <h2 style={{ fontSize: "30px" }}>Nhập A, B cho Q1-Q10</h2> */}
            {/* <h2
              style={{
                fontSize: "30px",
                fontWeight: "bold",
                color: "#007bff",
                textDecoration: "underline",
                marginRight: "30px",
              }}
            >
              BẢNG THÔNG
            </h2> */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #007bff",
                padding: "10px 15px",
                borderRadius: "8px",
                backgroundColor: "#e7f3ff",
                marginRight: "20px",
              }}
            >
              <label style={{ fontSize: "20px", fontWeight: "bold" }}>
                📊 Dòng tồn tại:
              </label>
              <input
                type="number"
                min="1"
                value={keepLastNRows}
                onChange={(e) =>
                  setKeepLastNRows(parseInt(e.target.value) || 1)
                }
                style={{
                  width: "80px",
                  padding: "6px",
                  fontSize: "20px",
                  border: "1px solid #007bff",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              />
              <button
                className="toolbar-btn"
                onClick={handleKeepLastNRows}
                style={{
                  fontSize: "20px",
                  background: "#ffc107",
                  color: "#212529",
                  border: "none",
                }}
              >
                Áp dụng
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <button
                className="toolbar-btn"
                onClick={handleSave}
                style={{
                  fontSize: "20px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                }}
              >
                💾 Lưu dữ liệu Bảng thông
              </button>
              <button
                className="toolbar-btn"
                onClick={() => setShowAddModal(true)}
                style={{
                  fontSize: "20px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                }}
              >
                ➕ Kích chọn số dòng thông
              </button>
              {saveStatus && (
                <span style={{ color: "#28a745" }}>{saveStatus}</span>
              )}
              <button
                className="toolbar-btn"
                onClick={() => (window.location.href = "/q1")}
                style={{
                  marginLeft: "10px",
                  background: "#28a745",
                  color: "white",
                  fontSize: "20px",
                  border: "none",
                }}
              >
                🔍 Ok toán
              </button>
            </div>
          </div>

          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: "calc(100vh - 200px)",
              border: "1px solid #ddd",
            }}
          >
            <table className="schedule-table">
              <thead>
                <tr>
                  <th
                    rowSpan="2"
                    style={{
                      padding: 0,
                      width: "80px !important",
                      minWidth: "80px !important",
                      fontSize: "22px",
                    }}
                  >
                    Chọn
                  </th>
                  <th rowSpan="2" style={{ padding: "8px 4px" }}>
                    STT
                  </th>
                  <th rowSpan="2" style={{ minWidth: "140px", width: "140px" }}>
                    Z
                  </th>
                  {/* Ngày đã bị loại bỏ */}
                  {Array.from({ length: 10 }, (_, qIndex) => {
                    // Màu background: Q lẻ màu ghi nhạt, Q chẵn màu xanh nhạt
                    const color = qIndex % 2 === 0 ? "#e0e0e0" : "#e3f2fd"; // Q lẻ (index 0,2,4,6,8) = ghi, Q chẵn (index 1,3,5,7,9) = xanh

                    return (
                      <th
                        key={qIndex}
                        colSpan="2"
                        style={{
                          backgroundColor: color,
                          borderLeft: "2px solid red",
                          borderRight: "2px solid red",
                          borderBottom: "2px solid black",
                        }}
                      >
                        Q{qIndex + 1}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {Array.from({ length: 10 }, (_, qIndex) => {
                    const color = qIndex % 2 === 0 ? "#e0e0e0" : "#e3f2fd"; // Q lẻ = ghi, Q chẵn = xanh

                    return (
                      <>
                        <th
                          key={`a-${qIndex}`}
                          style={{
                            backgroundColor: color,
                            borderLeft: "2px solid red",
                            borderRight: "2px solid #999",
                            minWidth: "60px",
                          }}
                        >
                          A
                        </th>
                        <th
                          key={`b-${qIndex}`}
                          style={{
                            backgroundColor: color,
                            borderRight: "2px solid red",
                            minWidth: "60px",
                          }}
                        >
                          B
                        </th>
                      </>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedIndices.map((rowIndex, idx) => (
                  <TaskRow
                    key={rowIndex}
                    rowIndex={rowIndex}
                    displayRowNumber={idx + 1}
                    isDeleted={deletedRows[rowIndex]}
                    isSelected={!!selectedRows[rowIndex]}
                    zValue={zValues[rowIndex]}
                    allQData={allQData}
                    onToggleSelect={handleToggleSelect}
                    onZChange={handleZChange}
                    onAChange={handleAChange}
                    onBChange={handleBChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Modal xác nhận thêm vào bảng tính */}
      {showAddModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "800px", width: "95%" }}
          >
            <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>
              🚀 Bạn có chắc chọn chọn dòng thông
            </h2>

            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ddd",
                padding: "10px",
                marginBottom: "20px",
                fontSize: "20px",
              }}
            >
              <p>Danh sách các dòng đã chọn:</p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {Object.keys(selectedRows).map((idx) => (
                  <li
                    key={idx}
                    style={{ padding: "5px", borderBottom: "1px solid #eee" }}
                  >
                    Dòng {parseInt(idx) + 1} - Thông số Z:{" "}
                    <strong>{zValues[idx] || "N/A"}</strong>
                  </li>
                ))}
                {Object.keys(selectedRows).length === 0 && (
                  <li style={{ color: "red" }}>Chưa chọn dòng nào!</li>
                )}
              </ul>
            </div>

            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "#f0f0f0",
                borderRadius: "8px",
              }}
            >
              <label
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                📅 Chọn ngày để lưu vào bảng tính:
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "20px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  background: "white",
                  fontSize: "20px",
                }}
              >
                Chọn lại
              </button>
              <button
                onClick={handleConfirmAddToApp}
                disabled={
                  isAddingToCalc || Object.keys(selectedRows).length === 0
                }
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                  fontSize: "20px",
                  cursor: isAddingToCalc ? "not-allowed" : "pointer",
                  opacity: isAddingToCalc ? 0.7 : 1,
                }}
              >
                {isAddingToCalc ? "⌛ Đang thêm..." : "✅ OK chọn"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .selected-draft-row {
          background-color: #f3e8ff !important;
        }
        .selected-draft-row td {
          border-top: 1px solid #6f42c1;
          border-bottom: 1px solid #6f42c1;
        }
      `}</style>
    </>
  );
}

export default InputPage;
