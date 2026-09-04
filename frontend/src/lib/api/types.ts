export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  request_id: string;
}

export interface ApiFailure {
  success: false;
  message: string | string[];
  request_id: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
  role: "USER" | "DEALER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}
