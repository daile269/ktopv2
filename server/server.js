import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Page from "./models/Page.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ktop-new";

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully!");
    console.log(`📦 Database: ${mongoose.connection.name}`);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "KTOP Backend API is running",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ==================== API ROUTES ====================

/**
 * GET /api/pages/:pageId
 * Load data for a specific page (q1, q2, etc.)
 */
app.get("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;

    console.log(`📖 Loading data for page: ${pageId}`);

    const page = await Page.findOne({ pageId });

    if (!page) {
      console.log(`ℹ️ No data found for ${pageId}, returning empty data`);
      return res.json({
        success: true,
        data: null,
      });
    }

    // Pad arrays to 125 rows
    const ROWS = 125;
    const aValues = [...page.aValues];
    const bValues = [...page.bValues];
    const zValues = page.zValues ? [...page.zValues] : [];
    const dateValues = [...page.dateValues];
    const deletedRows = [...page.deletedRows];

    while (aValues.length < ROWS) aValues.push("");
    while (bValues.length < ROWS) bValues.push("");
    while (zValues.length < ROWS) zValues.push("");
    while (dateValues.length < ROWS) dateValues.push("");
    while (deletedRows.length < ROWS) deletedRows.push(false);

    res.json({
      success: true,
      data: {
        aValues,
        bValues,
        zValues,
        dateValues,
        deletedRows,
        purpleRangeFrom: page.purpleRangeFrom || 0,
        purpleRangeTo: page.purpleRangeTo || 0,
        keepLastNRows: page.keepLastNRows || 125,
        allQData: page.allQData,
      },
    });

    console.log(`✅ Data loaded successfully for ${pageId}`);
  } catch (error) {
    console.error("❌ Error loading page data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/pages/:pageId
 * Save data for a specific page
 */
app.post("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const {
      aValues,
      bValues,
      zValues,
      dateValues,
      deletedRows,
      purpleRangeFrom,
      purpleRangeTo,
      keepLastNRows,
      allQData,
    } = req.body;

    console.log(`💾 Saving data for page: ${pageId}`);

    // Find last index with data
    let lastIndex = -1;
    const aLen = aValues ? aValues.length : 0;
    const bLen = bValues ? bValues.length : 0;
    const zLen = zValues ? zValues.length : 0;
    const dLen = dateValues ? dateValues.length : 0;
    const maxLen = Math.max(aLen, bLen, zLen, dLen);

    for (let i = maxLen - 1; i >= 0; i--) {
      if (
        (aValues && aValues[i]) ||
        (bValues && bValues[i]) ||
        (zValues && zValues[i]) ||
        (dateValues && dateValues[i])
      ) {
        lastIndex = i;
        break;
      }
    }

    // Trim empty values at the end
    const trimmedA = (lastIndex >= 0 && aValues) ? aValues.slice(0, lastIndex + 1) : [];
    const trimmedB = (lastIndex >= 0 && bValues) ? bValues.slice(0, lastIndex + 1) : [];
    const trimmedZ = (lastIndex >= 0 && zValues) ? zValues.slice(0, lastIndex + 1) : [];
    const trimmedDates = (lastIndex >= 0 && dateValues) ? dateValues.slice(0, lastIndex + 1) : [];
    const trimmedDeleted = (lastIndex >= 0 && deletedRows) ? deletedRows.slice(0, lastIndex + 1) : [];

    // Update or create page
    const page = await Page.findOneAndUpdate(
      { pageId },
      {
        pageId,
        aValues: trimmedA,
        bValues: trimmedB,
        zValues: trimmedZ,
        dateValues: trimmedDates,
        deletedRows: trimmedDeleted,
        purpleRangeFrom: purpleRangeFrom || 0,
        purpleRangeTo: purpleRangeTo || 0,
        keepLastNRows: keepLastNRows || 125,
        allQData,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    res.json({
      success: true,
      message: `Data saved successfully for ${pageId}`,
      data: {
        pageId: page.pageId,
        updatedAt: page.updatedAt,
      },
    });

    console.log(`✅ Data saved successfully for ${pageId}`);
  } catch (error) {
    console.error("❌ Error saving page data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/pages/:pageId
 * Delete data for a specific page
 */
app.delete("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;

    console.log(`🗑️ Deleting data for page: ${pageId}`);

    const result = await Page.findOneAndDelete({ pageId });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Page ${pageId} not found`,
      });
    }

    res.json({
      success: true,
      message: `Data deleted successfully for ${pageId}`,
    });

    console.log(`✅ Data deleted successfully for ${pageId}`);
  } catch (error) {
    console.error("❌ Error deleting page data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/pages
 * Get all pages (for debugging)
 */
app.get("/api/pages", async (req, res) => {
  try {
    const pages = await Page.find({}).select("pageId updatedAt");

    res.json({
      success: true,
      count: pages.length,
      data: pages,
    });
  } catch (error) {
    console.error("❌ Error fetching pages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log("");
  console.log("🚀 ========================================");
  console.log(`🚀 KTOP Backend Server is running!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🚀 API URL: http://localhost:${PORT}`);
  console.log("🚀 ========================================");
  console.log("");
  console.log("📍 Available endpoints:");
  console.log(`   GET    /api/health`);
  console.log(`   GET    /api/pages`);
  console.log(`   GET    /api/pages/:pageId`);
  console.log(`   POST   /api/pages/:pageId`);
  console.log(`   DELETE /api/pages/:pageId`);
  console.log("");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("⚠️ SIGTERM received, closing server...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n⚠️ SIGINT received, closing server...");
  await mongoose.connection.close();
  process.exit(0);
});
