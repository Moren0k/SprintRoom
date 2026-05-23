import { User } from "../../domain/aggregates/user";
import { SystemRole } from "../../domain/enums/system-role";
import { EmailAddress } from "../../domain/value-objects/email-address";
import { PersonName } from "../../domain/value-objects/person-name";
import { ApplicationError } from "../abstractions/application-error";
import type {
  CommandHandler,
  QueryHandler,
} from "../abstractions/messages";
import type {
  Clock,
  PasswordHasher,
  SessionTokenFactory,
  UnitOfWork,
  UserRepository,
} from "../abstractions/ports";
import type { RequestContext } from "../abstractions/request-context";
import type {
  AuthenticationResultDto,
  RegistrationResultDto,
  UserProfileDto,
  UserSummaryDto,
} from "../models/application-dtos";

/* ============================ Registro publico ============================ */

export interface RegisterPublicUserCommand {
  fullName: string;
  email: string;
  password: string;
}

export class RegisterPublicUserHandler
  implements CommandHandler<RegisterPublicUserCommand, RegistrationResultDto>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: RegisterPublicUserCommand): Promise<RegistrationResultDto> {
    const email = EmailAddress.create(command.email);
    const existingUser = await this.userRepository.getByEmail(email.value);
    if (existingUser !== null) {
      throw new ApplicationError("Ya existe un usuario registrado con ese correo.");
    }

    const user = User.registerPublic(
      PersonName.create(command.fullName),
      email,
      this.passwordHasher.hash(command.password),
      this.clock.utcNow,
    );

    await this.userRepository.add(user);
    await this.unitOfWork.saveChanges();

    return {
      userId: user.id,
      email: user.email.value,
      requiresRedirectToLogin: user.requiresInteractiveLogin,
    };
  }
}

/* ============================== Inicio de sesion ========================== */

export interface LoginCommand {
  email: string;
  password: string;
}

export class LoginHandler
  implements CommandHandler<LoginCommand, AuthenticationResultDto>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionTokenFactory: SessionTokenFactory,
  ) {}

  async handle(command: LoginCommand): Promise<AuthenticationResultDto> {
    const email = EmailAddress.create(command.email);
    const user = await this.userRepository.getByEmail(email.value);
    if (user === null) {
      throw new ApplicationError("Credenciales invalidas.");
    }
    if (!this.passwordHasher.verify(command.password, user.passwordHash)) {
      throw new ApplicationError("Credenciales invalidas.");
    }

    const token = this.sessionTokenFactory.create(user);
    return {
      userId: user.id,
      email: user.email.value,
      sessionToken: token,
      requiresRedirectToLogin: false,
    };
  }
}

/* =========================== Alta administrativa ========================== */

export interface CreateAdministrativeUserCommand {
  requestContext: RequestContext;
  fullName: string;
  email: string;
  password: string;
  systemRole: SystemRole;
}

export class CreateAdministrativeUserHandler
  implements CommandHandler<CreateAdministrativeUserCommand, UserSummaryDto>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: CreateAdministrativeUserCommand): Promise<UserSummaryDto> {
    if (command.requestContext.systemRole !== SystemRole.Administrator) {
      throw new ApplicationError(
        "Solo un administrador puede crear usuarios por alta administrativa.",
      );
    }

    const email = EmailAddress.create(command.email);
    const existingUser = await this.userRepository.getByEmail(email.value);
    if (existingUser !== null) {
      throw new ApplicationError("Ya existe un usuario registrado con ese correo.");
    }

    const user = User.provisionByAdministrator(
      PersonName.create(command.fullName),
      email,
      this.passwordHasher.hash(command.password),
      command.systemRole,
      this.clock.utcNow,
    );

    await this.userRepository.add(user);
    await this.unitOfWork.saveChanges();

    return {
      userId: user.id,
      fullName: user.fullName.value,
      email: user.email.value,
    };
  }
}

/* ====================== Consulta de perfil del usuario ==================== */

export interface GetCurrentUserProfileQuery {
  requestContext: RequestContext;
}

export class GetCurrentUserProfileHandler
  implements QueryHandler<GetCurrentUserProfileQuery, UserProfileDto>
{
  constructor(private readonly userRepository: UserRepository) {}

  async handle(query: GetCurrentUserProfileQuery): Promise<UserProfileDto> {
    const user = await this.userRepository.getById(query.requestContext.userId);
    if (user === null) {
      throw new ApplicationError("El usuario solicitado no existe.");
    }
    return {
      userId: user.id,
      fullName: user.fullName.value,
      email: user.email.value,
      systemRole: user.systemRole,
      origin: user.origin,
    };
  }
}

/* ===================== Actualizacion de perfil del usuario =============== */

export interface UpdateCurrentUserProfileCommand {
  requestContext: RequestContext;
  fullName: string;
  email: string;
}

export class UpdateCurrentUserProfileHandler
  implements CommandHandler<UpdateCurrentUserProfileCommand, UserProfileDto>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async handle(command: UpdateCurrentUserProfileCommand): Promise<UserProfileDto> {
    const user = await this.userRepository.getById(command.requestContext.userId);
    if (user === null) {
      throw new ApplicationError("El usuario solicitado no existe.");
    }

    const targetEmail = EmailAddress.create(command.email);
    const duplicate = await this.userRepository.getByEmail(targetEmail.value);
    if (duplicate !== null && duplicate.id !== user.id) {
      throw new ApplicationError("Ya existe un usuario registrado con ese correo.");
    }

    user.updateProfile(
      PersonName.create(command.fullName),
      targetEmail,
      this.clock.utcNow,
    );
    await this.unitOfWork.saveChanges();

    return {
      userId: user.id,
      fullName: user.fullName.value,
      email: user.email.value,
      systemRole: user.systemRole,
      origin: user.origin,
    };
  }
}
