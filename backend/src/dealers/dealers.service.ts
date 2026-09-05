import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DealerApplication,
  DealerApplicationStatus,
  DealerCompany,
  DealerMember,
  DealerMemberRole,
  Prisma,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { ReviewApplicationDto } from "./dto/review-application.dto";

@Injectable()
export class DealersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Submit a dealer application. Any authenticated user may apply.
   */
  async createApplication(
    userId: number,
    input: CreateApplicationDto,
  ): Promise<DealerApplication> {
    const existing = await this.prisma.dealerApplication.findFirst({
      where: { userId, status: DealerApplicationStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException(
        "You already have a pending dealer application",
      );
    }

    return this.prisma.dealerApplication.create({
      data: {
        userId,
        companyName: input.companyName,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        address: input.address,
        taxId: input.taxId,
      },
    });
  }

  /**
   * List applications submitted by the current user.
   */
  async findMyApplications(userId: number): Promise<DealerApplication[]> {
    return this.prisma.dealerApplication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get one application. Only the applicant or an admin may view it.
   */
  async findApplicationById(
    id: number,
    userId: number,
    role: UserRole,
  ): Promise<DealerApplication> {
    const application = await this.prisma.dealerApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException("Dealer application not found");
    }
    if (application.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "You do not have permission to view this application",
      );
    }
    return application;
  }

  /**
   * Admin: list all applications, optionally filtered by status.
   */
  async findAllApplications(
    status?: DealerApplicationStatus,
  ): Promise<DealerApplication[]> {
    const where: Prisma.DealerApplicationWhereInput = {};
    if (status) {
      where.status = status;
    }
    return this.prisma.dealerApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Admin: approve an application.
   * Creates the DealerCompany, makes the applicant the OWNER, and promotes
   * the user to the DEALER role.
   */
  async approveApplication(
    id: number,
    reviewerId: number,
    input: ReviewApplicationDto,
  ): Promise<DealerApplication> {
    const application = await this.prisma.dealerApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException("Dealer application not found");
    }
    if (application.status !== DealerApplicationStatus.PENDING) {
      throw new BadRequestException(
        "Only pending applications can be approved",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.dealerCompany.create({
        data: {
          name: application.companyName,
          contactName: application.contactName,
          contactPhone: application.contactPhone,
          address: application.address,
          taxId: application.taxId,
        },
      });

      await tx.dealerMember.create({
        data: {
          companyId: company.id,
          userId: application.userId,
          role: DealerMemberRole.OWNER,
        },
      });

      await tx.user.update({
        where: { id: application.userId },
        data: { role: UserRole.DEALER },
      });

      return tx.dealerApplication.update({
        where: { id },
        data: {
          status: DealerApplicationStatus.APPROVED,
          reviewNote: input.reviewNote,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          companyId: company.id,
        },
      });
    });
  }

  /**
   * Admin: reject an application.
   */
  async rejectApplication(
    id: number,
    reviewerId: number,
    input: ReviewApplicationDto,
  ): Promise<DealerApplication> {
    const application = await this.prisma.dealerApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException("Dealer application not found");
    }
    if (application.status !== DealerApplicationStatus.PENDING) {
      throw new BadRequestException(
        "Only pending applications can be rejected",
      );
    }

    return this.prisma.dealerApplication.update({
      where: { id },
      data: {
        status: DealerApplicationStatus.REJECTED,
        reviewNote: input.reviewNote,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Get a company. Only members of the company may view it.
   */
  async findCompanyById(
    companyId: number,
    userId: number,
  ): Promise<DealerCompany> {
    await this.ensureCompanyMember(companyId, userId);
    const company = await this.prisma.dealerCompany.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException("Dealer company not found");
    }
    return company;
  }

  /**
   * List members of a company. Only members of the company may view it.
   */
  async findCompanyMembers(
    companyId: number,
    userId: number,
  ): Promise<DealerMember[]> {
    await this.ensureCompanyMember(companyId, userId);
    return this.prisma.dealerMember.findMany({
      where: { companyId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Add a member to a company. Only OWNER or ADMIN members may do this.
   */
  async addMember(
    companyId: number,
    userId: number,
    email: string,
  ): Promise<DealerMember> {
    const currentMember = await this.ensureCompanyMember(companyId, userId);
    if (
      currentMember.role !== DealerMemberRole.OWNER &&
      currentMember.role !== DealerMemberRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Only company owners or admins can add members",
      );
    }

    const targetUser = await this.usersService.findByEmail(email);
    if (!targetUser) {
      throw new NotFoundException("User with this email does not exist");
    }

    const existing = await this.prisma.dealerMember.findUnique({
      where: {
        companyId_userId: { companyId, userId: targetUser.id },
      },
    });
    if (existing) {
      throw new ConflictException("This user is already a company member");
    }

    return this.prisma.dealerMember.create({
      data: {
        companyId,
        userId: targetUser.id,
        role: DealerMemberRole.MEMBER,
      },
    });
  }

  /**
   * Verify that the user belongs to the company and return the membership.
   * Throws ForbiddenException if not a member.
   */
  private async ensureCompanyMember(
    companyId: number,
    userId: number,
  ): Promise<DealerMember> {
    const member = await this.prisma.dealerMember.findUnique({
      where: {
        companyId_userId: { companyId, userId },
      },
    });
    if (!member) {
      throw new ForbiddenException(
        "You do not have permission to access this company",
      );
    }
    return member;
  }
}
