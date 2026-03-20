import { StatusCodes } from 'http-status-codes'

export class AppError extends Error {
  public readonly statusCode: number

  // Default para BAD_REQUEST (400) em vez de número mágico
  constructor(message: string, statusCode: number = StatusCodes.BAD_REQUEST) {
    super(message)
    this.statusCode = statusCode
  }
}
