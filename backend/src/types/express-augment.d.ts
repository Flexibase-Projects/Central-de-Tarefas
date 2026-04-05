declare global {
  namespace Express {
    interface Request {
      /** Definido quando havia Bearer mas `auth.getUser` falhou (JWT inválido / projeto errado). */
      authFailureCode?: 'AUTH_TOKEN_INVALID';
    }
    interface Locals {
      requestId?: string;
    }
  }
}

export {};
