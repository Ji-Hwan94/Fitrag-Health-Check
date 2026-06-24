import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CreateRagDocumentDto, RagSearchDto } from './dto';
import { RagService } from './rag.service';

@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Post('documents')
  createDocument(@Body() dto: CreateRagDocumentDto) {
    return this.rag.createDocument(dto);
  }

  @Post('search')
  search(@Body() dto: RagSearchDto) {
    return this.rag.search(dto);
  }
}
