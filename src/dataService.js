// API Configuration
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5010";

/**
 * Lưu dữ liệu trang lên MongoDB qua Backend API
 * @param {string} pageId - ID của trang (vd: 'q1', 'q2')
 * @param {Array} t1Values - Mảng giá trị T1
 * @param {Array} t2Values - Mảng giá trị T2
 * @param {Array} dateValues - Mảng giá trị ngày tháng
 * @param {Array} deletedRows - Mảng đánh dấu rows bị xóa
 * @param {number} purpleRangeFrom - Khoảng số bắt đầu tô tím
 * @param {number} purpleRangeTo - Khoảng số kết thúc tô tím
 * @param {number} keepLastNRows - Số dòng tồn tại
 */
export const savePageData = async (
  pageId,
  aValues,
  bValues,
  zValues,
  dateValues,
  deletedRows = [],
  purpleRangeFrom = 0,
  purpleRangeTo = 0,
  keepLastNRows = 125,
  allQData = undefined,
) => {
  try {
    const response = await fetch(`${API_URL}/api/pages/${pageId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aValues,
        bValues,
        zValues,
        dateValues,
        deletedRows,
        purpleRangeFrom,
        purpleRangeTo,
        keepLastNRows,
        allQData,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save data");
    }

    return { success: true };
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Tải dữ liệu trang từ MongoDB qua Backend API
 * @param {string} pageId - ID của trang
 */
export const loadPageData = async (pageId) => {
  try {
    const response = await fetch(`${API_URL}/api/pages/${pageId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load data");
    }

    if (result.success && result.data) {
      const data = result.data;

      // Pad data về 125 rows (match với App.jsx)
      const ROWS = 125;

      // Ensure data is always an array
      const a = Array.isArray(data.aValues) ? [...data.aValues] : [];
      const b = Array.isArray(data.bValues) ? [...data.bValues] : [];
      const z = Array.isArray(data.zValues) ? [...data.zValues] : [];
      const dates = Array.isArray(data.dateValues) ? [...data.dateValues] : [];
      const deleted = Array.isArray(data.deletedRows)
        ? [...data.deletedRows]
        : [];

      // Pad với empty strings/false
      while (a.length < ROWS) a.push("");
      while (b.length < ROWS) b.push("");
      while (z.length < ROWS) z.push("");
      while (dates.length < ROWS) dates.push("");
      while (deleted.length < ROWS) deleted.push(false);

      return {
        success: true,
        data: {
          aValues: a,
          bValues: b,
          zValues: z,
          dateValues: dates,
          deletedRows: deleted,
          purpleRangeFrom: data.purpleRangeFrom || 0,
          purpleRangeTo: data.purpleRangeTo || 0,
          keepLastNRows: data.keepLastNRows || 125,
          allQData: data.allQData,
        },
      };
    } else {
      console.log(`No data found for ${pageId}, returning null`);
      return { success: true, data: null };
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Xóa dữ liệu trang từ MongoDB qua Backend API
 * @param {string} pageId - ID của trang
 */
export const deletePageData = async (pageId) => {
  try {
    const response = await fetch(`${API_URL}/api/pages/${pageId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete data");
    }

    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    return { success: false, error: error.message };
  }
};
