import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DealerApplicationStatus } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AddMemberDto } from "./dto/add-member.dto";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { ReviewApplicationDto } from "./dto/review-application.dto";
import { DealersService } from "./dealers.service";

interface AuthenticatedRequest {
  user: JwtPayload;
}

@ApiTags("dealers")
@ApiBearerAuth()
@Controller("dealers")
export class DealersController {
  constructor(private readonly dealersService: DealersService) {}

  @Post("applications")
  @ApiOperation({ summary: "Submit a dealer application" })
  createApplication(
    @Request() request: AuthenticatedRequest,
    @Body() input: CreateApplicationDto,
  ) {
    return this.dealersService.createApplication(request.user.sub, input);
  }

  @Get("applications")
  @ApiOperation({ summary: "List my dealer applications" })
  findMyApplications(@Request() request: AuthenticatedRequest) {
    return this.dealersService.findMyApplications(request.user.sub);
  }

  @Get("applications/:id")
  @ApiOperation({ summary: "Get a dealer application by id" })
  findApplication(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.dealersService.findApplicationById(
      id,
      request.user.sub,
      request.user.role,
    );
  }

  @Get("admin/applications")
  @Roles("ADMIN")
  @ApiOperation({ summary: "List all dealer applications (admin)" })
  findAllApplications(@Query("status") status?: DealerApplicationStatus) {
    return this.dealersService.findAllApplications(status);
  }

  @Patch("admin/applications/:id/approve")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Approve a dealer application (admin)" })
  approveApplication(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() input: ReviewApplicationDto,
  ) {
    return this.dealersService.approveApplication(id, request.user.sub, input);
  }

  @Patch("admin/applications/:id/reject")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Reject a dealer application (admin)" })
  rejectApplication(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() input: ReviewApplicationDto,
  ) {
    return this.dealersService.rejectApplication(id, request.user.sub, input);
  }

  @Get("companies/:id")
  @ApiOperation({ summary: "Get a dealer company (members only)" })
  findCompany(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.dealersService.findCompanyById(id, request.user.sub);
  }

  @Get("companies/:id/members")
  @ApiOperation({ summary: "List company members (members only)" })
  findCompanyMembers(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.dealersService.findCompanyMembers(id, request.user.sub);
  }

  @Post("companies/:id/members")
  @ApiOperation({ summary: "Add a company member (owner/admin only)" })
  addMember(
    @Request() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() input: AddMemberDto,
  ) {
    return this.dealersService.addMember(id, request.user.sub, input.email);
  }
}
