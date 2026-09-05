import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  DealerApplication,
  DealerApplicationStatus,
  DealerCompany,
  DealerMember,
  DealerMemberRole,
  UserRole,
} from "@prisma/client";
import { DealersService } from "./dealers.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

const now = new Date("2026-09-05T00:00:00.000Z");

function makeApplication(
  overrides: Partial<DealerApplication> = {},
): DealerApplication {
  return {
    id: 1,
    userId: 10,
    companyName: "Acme Sports",
    contactName: "Alice",
    contactPhone: "1234567890",
    address: "123 Main St",
    taxId: "TAX123",
    status: DealerApplicationStatus.PENDING,
    reviewNote: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    companyId: null,
    ...overrides,
  };
}

function makeMember(overrides: Partial<DealerMember> = {}): DealerMember {
  return {
    id: 1,
    companyId: 1,
    userId: 10,
    role: DealerMemberRole.OWNER,
    createdAt: now,
    ...overrides,
  };
}

function makeCompany(overrides: Partial<DealerCompany> = {}): DealerCompany {
  return {
    id: 1,
    name: "Acme Sports",
    contactName: "Alice",
    contactPhone: "1234567890",
    address: "123 Main St",
    taxId: "TAX123",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("DealersService", () => {
  const prisma = {
    dealerApplication: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dealerCompany: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    dealerMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const usersService = {
    findByEmail: jest.fn(),
  } as unknown as UsersService;

  const service = new DealersService(prisma, usersService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("createApplication", () => {
    it("creates an application when none is pending", async () => {
      const input = { companyName: "Acme Sports" };
      const application = makeApplication();
      jest.spyOn(prisma.dealerApplication, "findFirst").mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.dealerApplication, "create")
        .mockResolvedValue(application);

      await expect(service.createApplication(10, input)).resolves.toEqual(
        application,
      );
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 10,
          companyName: "Acme Sports",
        }),
      });
    });

    it("throws ConflictException when a pending application exists", async () => {
      jest
        .spyOn(prisma.dealerApplication, "findFirst")
        .mockResolvedValue(makeApplication());
      const createSpy = jest.spyOn(prisma.dealerApplication, "create");

      await expect(
        service.createApplication(10, { companyName: "Acme Sports" }),
      ).rejects.toEqual(
        new ConflictException("You already have a pending dealer application"),
      );
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe("findApplicationById", () => {
    it("returns the application for the applicant", async () => {
      const application = makeApplication({ userId: 10 });
      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(application);

      await expect(
        service.findApplicationById(1, 10, UserRole.USER),
      ).resolves.toEqual(application);
    });

    it("returns the application for an admin even if not the applicant", async () => {
      const application = makeApplication({ userId: 10 });
      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(application);

      await expect(
        service.findApplicationById(1, 99, UserRole.ADMIN),
      ).resolves.toEqual(application);
    });

    it("throws ForbiddenException for a non-applicant non-admin", async () => {
      const application = makeApplication({ userId: 10 });
      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(application);

      await expect(
        service.findApplicationById(1, 99, UserRole.USER),
      ).rejects.toEqual(
        new ForbiddenException(
          "You do not have permission to view this application",
        ),
      );
    });

    it("throws NotFoundException when the application does not exist", async () => {
      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(null);

      await expect(
        service.findApplicationById(1, 10, UserRole.USER),
      ).rejects.toEqual(new NotFoundException("Dealer application not found"));
    });
  });

  describe("approveApplication", () => {
    it("creates company, owner membership, promotes user and updates application", async () => {
      const application = makeApplication();
      const company = makeCompany();
      const approved = makeApplication({
        status: DealerApplicationStatus.APPROVED,
        reviewedById: 99,
        reviewedAt: now,
        companyId: 1,
      });

      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(application);

      const tx = {
        dealerCompany: { create: jest.fn().mockResolvedValue(company) },
        dealerMember: { create: jest.fn().mockResolvedValue(makeMember()) },
        user: { update: jest.fn().mockResolvedValue({}) },
        dealerApplication: { update: jest.fn().mockResolvedValue(approved) },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation((fn) => Promise.resolve(fn(tx as never)));

      const result = await service.approveApplication(1, 99, {
        reviewNote: "approved",
      });

      expect(result).toEqual(approved);
      expect(tx.dealerCompany.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "Acme Sports" }),
      });
      expect(tx.dealerMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 1,
          userId: 10,
          role: DealerMemberRole.OWNER,
        }),
      });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { role: UserRole.DEALER },
      });
    });

    it("throws BadRequestException when the application is not pending", async () => {
      const application = makeApplication({
        status: DealerApplicationStatus.APPROVED,
      });
      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(application);

      await expect(service.approveApplication(1, 99, {})).rejects.toEqual(
        new BadRequestException("Only pending applications can be approved"),
      );
    });
  });

  describe("rejectApplication", () => {
    it("updates the application to rejected", async () => {
      const application = makeApplication();
      const rejected = makeApplication({
        status: DealerApplicationStatus.REJECTED,
        reviewedById: 99,
        reviewedAt: now,
      });
      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(application);
      jest
        .spyOn(prisma.dealerApplication, "update")
        .mockResolvedValue(rejected);

      await expect(
        service.rejectApplication(1, 99, { reviewNote: "missing docs" }),
      ).resolves.toEqual(rejected);
    });

    it("throws BadRequestException when the application is not pending", async () => {
      const application = makeApplication({
        status: DealerApplicationStatus.REJECTED,
      });
      jest
        .spyOn(prisma.dealerApplication, "findUnique")
        .mockResolvedValue(application);

      await expect(service.rejectApplication(1, 99, {})).rejects.toEqual(
        new BadRequestException("Only pending applications can be rejected"),
      );
    });
  });

  describe("findCompanyMembers", () => {
    it("returns members when the user is a company member", async () => {
      const member = makeMember();
      const members = [member];
      jest.spyOn(prisma.dealerMember, "findUnique").mockResolvedValue(member);
      jest.spyOn(prisma.dealerMember, "findMany").mockResolvedValue(members);

      await expect(service.findCompanyMembers(1, 10)).resolves.toEqual(members);
    });

    it("throws ForbiddenException when the user is not a member", async () => {
      jest.spyOn(prisma.dealerMember, "findUnique").mockResolvedValue(null);

      await expect(service.findCompanyMembers(1, 99)).rejects.toEqual(
        new ForbiddenException(
          "You do not have permission to access this company",
        ),
      );
    });
  });

  describe("addMember", () => {
    it("adds a member when the caller is an owner", async () => {
      const owner = makeMember({ role: DealerMemberRole.OWNER });
      const newMember = makeMember({ id: 2, userId: 20 });
      jest.spyOn(prisma.dealerMember, "findUnique").mockResolvedValue(owner);
      jest
        .spyOn(usersService, "findByEmail")
        .mockResolvedValue({ id: 20 } as never);
      jest
        .spyOn(prisma.dealerMember, "findUnique")
        .mockResolvedValueOnce(owner)
        .mockResolvedValueOnce(null);
      jest.spyOn(prisma.dealerMember, "create").mockResolvedValue(newMember);

      await expect(
        service.addMember(1, 10, "new@example.com"),
      ).resolves.toEqual(newMember);
    });

    it("throws ForbiddenException when the caller is a regular member", async () => {
      const member = makeMember({ role: DealerMemberRole.MEMBER });
      jest.spyOn(prisma.dealerMember, "findUnique").mockResolvedValue(member);

      await expect(service.addMember(1, 10, "new@example.com")).rejects.toEqual(
        new ForbiddenException("Only company owners or admins can add members"),
      );
    });
  });
});
