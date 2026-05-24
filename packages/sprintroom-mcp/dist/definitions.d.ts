export interface ToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: Record<string, unknown>;
}
export declare const MCP_TOOL_DEFINITIONS: readonly ToolDefinition[];
