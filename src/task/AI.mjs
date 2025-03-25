import OpenAI from 'openai'
import { Readable } from 'stream'


class AI {
    #client
    #state


    constructor( { provider, credentials } ) {
        const { api_key } = credentials
        this.#client = new OpenAI( { 'apiKey': api_key } )
        this.#state = { provider, ...credentials }

        return true
    }


    async getAssistants() {
        const assistants = await this.#client.beta.assistants.list()
        return assistants
    }


    async deleteAssistant( { assistantId } ) {
        await this.#client.beta.assistants.del( assistantId )
        return true
    }


    async createAssistant( payload ) {
        const assistant = await this.#client.beta.assistants.create( payload )
        return assistant
    }


    async askWithFiles( { userMessage, fileString, assistantId, fileStrings=[] } ) {
      // === 1. Upload file ===

        const fileStringIds = await Promise.all( 
            fileStrings
                .map( async ( fileString ) => {
                    const { id } = await this.#client.files.create( {
                        'file': new File( [ fileString ], 'uploaded.txt'),
                        'purpose': 'assistants',
                    } )
                    return id
                } )
        )

/*
        const uploadedFile = await this.#client.files.create( {
            file: new File( [ fileString ], 'uploaded.txt'),
            purpose: 'assistants',
        } )
*/
  
        console.log( `📁 File(s) uploaded: ${fileStringIds.join(', ')}` )
    
        // === 2. Use existing assistant ===
        console.log( `🤖 Using Assistant: ${assistantId}` )
    
        // === 3. Create thread ===
        const thread = await this.#client.beta.threads.create();
        console.log(`🧵 Thread created: ${thread.id}`);
    
        // === 4. Add user message and file attachment ===
        console.log(`💬 Sending user message...`);
        await this.#client.beta.threads.messages.create(thread.id, {
            'role': 'user',
            'content': [
                {
                    type: 'text',
                    text: userMessage,
                },
            ],
            'attachments': fileStringIds
                .map( ( id ) => ( {
                    'file_id': id,
                    'tools': [ { 'type': 'file_search' } ],
                } 
            ) )
/*
          attachments: [
              {
                  file_id: uploadedFile.id,
                  tools: [{ type: 'file_search' }],
              },
          ],
*/
        } )
  
        console.log('📨 Message sent to assistant.');
    
        // === 5. Start assistant run ===
        const run = await this.#client.beta.threads.runs
            .create(
                thread.id, 
                { 'assistant_id': assistantId }
            )
    
        console.log('🏃‍♂️ Assistant is processing your request...');
    
        // === 6. Wait for completion ===
        let status;
        do {
            await new Promise( ( r ) => setTimeout( r, 1000 ) )
            status = await this.#client.beta.threads.runs.retrieve(thread.id, run.id)
            process.stdout.write(`⏳ Status: ${status.status.padEnd(10)}\r`)
        } while (status.status !== 'completed')
    
        console.log('\n✅ Assistant has completed the task!')
  
        // === 7. Fetch and display response ===
        const messages = await this.#client.beta.threads.messages.list(thread.id)
        const lastMessage = messages.data[0]
        
        // === 8. Clean up ===
        await this.#client.beta.threads.del(thread.id)
        console.log(`\n🗑️ Thread deleted: ${thread.id}`)

        const fileDeletions = await Promise.all(
            fileStringIds
                .map( async ( id ) => {
                    await this.#client.files.del( id )
                    return id
                } )
        )
  
        // await this.#client.files.del(uploadedFile.id);
        console.log(`🗑️ File(s) deleted: ${fileDeletions.join( ', ')}`)
    
        return {
            'status': true,
            'result': lastMessage.content[ 0 ].text.value
        }
  }
  
}


export { AI }
