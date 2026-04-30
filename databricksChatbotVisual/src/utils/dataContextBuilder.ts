import powerbi from "powerbi-visuals-api";

export interface DataContext {
    columns: ColumnInfo[];
    rowCount: number;
    sampleRows: (string | number | boolean | null)[][];
    summary: string;
}

interface ColumnInfo {
    name: string;
    type: string;
    role: string;
}

/**
 * Converts a Power BI DataView (table mapping) into a compact context
 * object that is serialized and sent to the LLM alongside the user's question.
 */
export function buildDataContext(
    dataView: powerbi.DataView | undefined,
    maxSampleRows: number = 50
): DataContext | null {
    if (!dataView?.table) return null;

    const table = dataView.table;
    const columns = table.columns || [];
    const rows = table.rows || [];

    // Build column metadata
    const columnInfo: ColumnInfo[] = columns.map(col => ({
        name: col.displayName,
        type: getColumnType(col),
        role: col.roles ? Object.keys(col.roles).join(", ") : "unknown"
    }));

    // Limit sample rows
    const sampleCount = Math.min(rows.length, maxSampleRows);
    const sampleRows = rows.slice(0, sampleCount).map(row =>
        row.map(cell => formatCell(cell))
    );

    const summary = buildSummary(columnInfo, rows.length, sampleRows);

    return {
        columns: columnInfo,
        rowCount: rows.length,
        sampleRows,
        summary
    };
}

/**
 * Serializes DataContext into a prompt-ready string for the LLM system context.
 */
export function serializeDataContext(ctx: DataContext): string {
    const colHeader = ctx.columns.map(c => `"${c.name}" (${c.type})`).join(", ");
    const rowLines = ctx.sampleRows.map((row, i) =>
        `Row ${i + 1}: ${row.map((v, j) => `${ctx.columns[j]?.name ?? j}=${JSON.stringify(v)}`).join(", ")}`
    );

    return [
        `=== DATA CONTEXT ===`,
        `Total rows in dataset: ${ctx.rowCount}`,
        `Columns: ${colHeader}`,
        ``,
        ctx.rowCount > ctx.sampleRows.length
            ? `Showing first ${ctx.sampleRows.length} of ${ctx.rowCount} rows:`
            : `All ${ctx.rowCount} rows:`,
        ...rowLines,
        `=== END DATA CONTEXT ===`
    ].join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getColumnType(col: powerbi.DataViewMetadataColumn): string {
    if (!col.type) return "unknown";
    if (col.type.numeric) return "number";
    if (col.type.dateTime) return "date";
    if (col.type.bool) return "boolean";
    if (col.type.text) return "text";
    return "unknown";
}

function formatCell(value: powerbi.PrimitiveValue): string | number | boolean | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString().split("T")[0];
    return value as string | number | boolean;
}

function buildSummary(
    columns: ColumnInfo[],
    rowCount: number,
    sampleRows: (string | number | boolean | null)[][]
): string {
    const numericCols = columns
        .map((col, idx) => ({ col, idx }))
        .filter(({ col }) => col.type === "number");

    const parts: string[] = [`${rowCount} total rows, ${columns.length} columns`];

    // Add basic stats for numeric columns
    for (const { col, idx } of numericCols.slice(0, 3)) {
        const values = sampleRows
            .map(row => row[idx])
            .filter((v): v is number => typeof v === "number");
        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            parts.push(`${col.name}: avg=${avg.toFixed(2)}, sum=${sum.toFixed(2)} (sample)`);
        }
    }

    return parts.join("; ");
}
