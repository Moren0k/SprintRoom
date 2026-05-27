import { PersistenceError } from "./errors";

export type QueryFilter =
  | { readonly operator: "eq"; readonly column: string; readonly value: unknown }
  | { readonly operator: "in"; readonly column: string; readonly value: ReadonlyArray<unknown> };

export interface SelectRowsOptions {
  readonly filters?: ReadonlyArray<QueryFilter>;
  readonly orderBy?: {
    readonly column: string;
    readonly ascending?: boolean;
  };
}

export interface WriteRowsOptions {
  readonly onConflict?: string;
}

export interface RpcOptions {
  readonly args?: Record<string, unknown>;
}

export interface InsForgeDatabaseGateway {
  selectRows<T>(table: string, options?: SelectRowsOptions): Promise<T[]>;
  selectOne<T>(table: string, filters: ReadonlyArray<QueryFilter>): Promise<T | null>;
  insertRows<T extends object>(table: string, rows: ReadonlyArray<T>): Promise<void>;
  upsertRows<T extends object>(
    table: string,
    rows: ReadonlyArray<T>,
    options?: WriteRowsOptions,
  ): Promise<void>;
  deleteRows(table: string, filters: ReadonlyArray<QueryFilter>): Promise<void>;
  rpc<T>(functionName: string, options?: RpcOptions): Promise<T>;
}

export interface InsForgeSdkClientLike {
  readonly database: {
    from(table: string): InsForgeTableQueryBuilder;
    rpc(functionName: string, args?: Record<string, unknown>): InsForgeAwaitableQuery;
  };
}

interface InsForgeQueryResult {
  readonly data?: unknown;
  readonly error?: unknown;
}

type InsForgeAwaitableQuery = PromiseLike<InsForgeQueryResult>;

interface InsForgeFilterableQuery extends InsForgeAwaitableQuery {
  eq(column: string, value: unknown): InsForgeFilterableQuery;
  in(column: string, value: ReadonlyArray<unknown>): InsForgeFilterableQuery;
  order(column: string, options: { readonly ascending: boolean }): InsForgeFilterableQuery;
}

interface InsForgeTableQueryBuilder {
  select(columns: string): InsForgeFilterableQuery;
  insert(rows: ReadonlyArray<object>): InsForgeAwaitableQuery;
  upsert(
    rows: ReadonlyArray<object>,
    options: { readonly onConflict?: string },
  ): InsForgeAwaitableQuery;
  delete(): InsForgeFilterableQuery;
}

export class SdkInsForgeDatabaseGateway implements InsForgeDatabaseGateway {
  constructor(private readonly client: InsForgeSdkClientLike) {}

  async selectRows<T>(table: string, options: SelectRowsOptions = {}): Promise<T[]> {
    if (hasEmptyInFilter(options.filters ?? [])) {
      return [];
    }
    let query = this.client.database.from(table).select("*");
    query = this.applyFilters(query, options.filters ?? []);
    if (options.orderBy !== undefined) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }
    const result = await query;
    if (result.error !== null && result.error !== undefined) {
      throw new PersistenceError(`No fue posible consultar ${table}.`, result.error);
    }
    return (result.data ?? []) as T[];
  }

  async selectOne<T>(table: string, filters: ReadonlyArray<QueryFilter>): Promise<T | null> {
    const rows = await this.selectRows<T>(table, { filters });
    return rows[0] ?? null;
  }

  async insertRows<T extends object>(table: string, rows: ReadonlyArray<T>): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const result = await this.client.database.from(table).insert([...rows]);
    if (result.error !== null && result.error !== undefined) {
      throw new PersistenceError(`No fue posible insertar registros en ${table}.`, result.error);
    }
  }

  async upsertRows<T extends object>(
    table: string,
    rows: ReadonlyArray<T>,
    options: WriteRowsOptions = {},
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const result = await this.client.database.from(table).upsert([...rows], {
      onConflict: options.onConflict,
    });
    if (result.error !== null && result.error !== undefined) {
      throw new PersistenceError(`No fue posible guardar registros en ${table}.`, result.error);
    }
  }

  async deleteRows(table: string, filters: ReadonlyArray<QueryFilter>): Promise<void> {
    if (filters.length === 0) {
      throw new PersistenceError(`No se permite eliminar en ${table} sin filtros.`);
    }
    if (hasEmptyInFilter(filters)) {
      return;
    }
    let query = this.client.database.from(table).delete();
    query = this.applyFilters(query, filters);
    const result = await query;
    if (result.error !== null && result.error !== undefined) {
      throw new PersistenceError(`No fue posible eliminar registros en ${table}.`, result.error);
    }
  }

  async rpc<T>(functionName: string, options: RpcOptions = {}): Promise<T> {
    const result = await this.client.database.rpc(functionName, options.args);
    if (result.error !== null && result.error !== undefined) {
      throw new PersistenceError(`No fue posible ejecutar la funcion ${functionName}.`, result.error);
    }
    return (result.data ?? null) as T;
  }

  private applyFilters(
    query: InsForgeFilterableQuery,
    filters: ReadonlyArray<QueryFilter>,
  ): InsForgeFilterableQuery {
    let current = query;
    for (const filter of filters) {
      if (filter.operator === "eq") {
        current = current.eq(filter.column, filter.value);
      } else {
        current = current.in(filter.column, [...filter.value]);
      }
    }
    return current;
  }
}

function hasEmptyInFilter(filters: ReadonlyArray<QueryFilter>): boolean {
  return filters.some((filter) => filter.operator === "in" && filter.value.length === 0);
}
