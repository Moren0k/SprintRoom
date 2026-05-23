/**
 * Contratos minimos de comandos y queries. En TypeScript no es necesario
 * cargar el tipo en una interfaz `marker` separada, asi que utilizamos
 * `type` parametricos. Los handlers reciben directamente el mensaje y
 * devuelven una promesa con el resultado.
 */
export type Command<TResult> = { readonly __command?: TResult };
export type Query<TResult> = { readonly __query?: TResult };

export interface CommandHandler<TCommand, TResult> {
  handle(command: TCommand): Promise<TResult>;
}

export interface QueryHandler<TQuery, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Unit equivalente al `Unit` de C#. Se utiliza como retorno para comandos
 * que no producen un valor de dominio explicito.
 */
export type Unit = "unit";
export const Unit: Unit = "unit";
