/**
 * Re-exports publicos de la capa de dominio. Permite importar entidades,
 * value objects, eventos, politicas y servicios desde un unico punto.
 */
export * from "./abstractions/aggregate-root";
export * from "./abstractions/domain-event";
export * from "./abstractions/entity";
export * from "./abstractions/value-object";

export * from "./aggregates/project";
export * from "./aggregates/sprint-task";
export * from "./aggregates/user";
export * from "./aggregates/user-story";

export * from "./entities/project-member";
export * from "./entities/task-comment";

export * from "./enums/account-origin";
export * from "./enums/permission-action";
export * from "./enums/project-role";
export * from "./enums/system-role";

export * from "./errors/domain-error";

export * from "./events/project-created-domain-event";
export * from "./events/task-comment-added-domain-event";
export * from "./events/user-registered-domain-event";

export * from "./ids/id-factory";
export * from "./ids/project-id";
export * from "./ids/sprint-task-id";
export * from "./ids/task-comment-id";
export * from "./ids/user-id";
export * from "./ids/user-story-id";

export * from "./policies/audit-policy";
export * from "./policies/authorization-policy";
export * from "./policies/visibility-policy";

export * from "./services/deletion-confirmation-policy";
export * from "./services/deletion-guard";
export * from "./services/project-progress-calculator";

export * from "./value-objects/comment-body";
export * from "./value-objects/description";
export * from "./value-objects/email-address";
export * from "./value-objects/external-reference";
export * from "./value-objects/person-name";
export * from "./value-objects/project-name";
export * from "./value-objects/work-item-name";
