import { Transcript } from './task/Transcript.mjs'
import { AI } from './task/AI.mjs'


class YouGPT {
    #transcript
    #ai


    constructor( { aiProvider, aiCredentials } ) {
        this.#transcript = new Transcript()
        this.#ai = new AI( {
            'provider': aiProvider,
            'credentials': aiCredentials
        } )

        return true
    }


    async getAssistants() {
        const assistants = await this.#ai.getAssistants()
        return assistants
    }


    async deleteAssistant( { assistantId } ) {
        const result = await this.#ai.deleteAssistant( { assistantId } )
        return result
    }


    async createAssistant( payload ) {
        const assistant = await this.#ai.createAssistant( payload )
        return assistant
    }


    async getTranscript( { url } ) {
        const { status, result } = await this.#transcript.fetch( { url } )
        return { status, result }
    }
    

    async transcriptToAI( { url, assistantId, userMessage } ) {
        const struct = {
            'status': false,
            'transcript': null,
            'ai': null
        }

        const { status: tStatus, result: tResult } = await this.#transcript.fetch( { url } )
        struct['transcript'] = tResult
        if( tStatus === false ) { return struct }

        const { transcript: fileString } = tResult
        const { status: aStatus, result: aResult } = await this.#ai
            .askWithFile( { userMessage, fileString, assistantId } )
        struct['ai'] = aResult
        if( aStatus === true && tStatus === true ) { struct['status'] = true }

        return struct
    }
}


export { YouGPT }