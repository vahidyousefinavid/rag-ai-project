import { Controller, Post, Body } from "@nestjs/common";
import { RagService } from "./rag.service";

@Controller("chat")
export class RagController {

    constructor(private rag: RagService) { }

    @Post()
    async chat(@Body("message") message: string) {

        const answer = await this.rag.ask(message);

        return {
            answer: answer
        };

    }

}
