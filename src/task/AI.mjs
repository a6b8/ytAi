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


    async askWithFileOld( { userMessage, fileString, assistantId } ) {

        const uploadedFile = await this.#client.files.create( {
            'file': new File( [ fileString ], 'abc.txt' ),
            'purpose': 'assistants',
        } )

        console.log( '📁 Datei hochgeladen:', uploadedFile.id )

        // === 3. Bestehenden Assistant verwenden ===
        console.log( '🤖 Verwende Assistant:', assistantId )

        // === 4. Thread erstellen ===
        const thread = await this.#client.beta.threads.create()
        console.log( '🧵 Thread erstellt:', thread.id )
console.log( 'userMessage:', userMessage )
        // === 5. Nutzerfrage + Datei an Thread hängen ===
        await this.#client.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userMessage,
              },
            ],
            attachments: [
              {
                file_id: uploadedFile.id,
                tools: [ { type: 'file_search' } ],
              },
            ],
          } );
      
        console.log('📨 Frage gesendet.');

        // === 6. Run starten ===
        const run = await this.#client.beta.threads.runs
            .create( thread.id, { 'assistant_id': assistantId } )

        console.log('🏃‍♂️ Assistant denkt nach...');

        // === 7. Run abwarten ===
        let status
        do {
            await new Promise( ( r ) => setTimeout( r, 1000 ) )
            status = await this.#client.beta.threads.runs.retrieve( thread.id, run.id )
            process.stdout.write( `⏳ Status: ${status.status}...\r` )
        } while( status.status !== 'completed' )

        console.log( '\n✅ Antwort verfügbar!' )

        // === 8. Antwort abrufen ===
        const messages = await this.#client.beta.threads.messages.list( thread.id )
        const lastMessage = messages.data[ 0 ]

        console.log('\n💬 Antwort:\n');
        console.log(lastMessage.content[0].text.value);

        // === 9. Thread löschen ===
        await this.#client.beta.threads.del(thread.id);
        console.log('\n🗑️ Thread gelöscht:', thread.id);

        // Optional: Datei löschen
        await this.#client.files.del(uploadedFile.id);
        console.log('🗑️ Datei gelöscht:', uploadedFile.id);

        return { 'status': true, 'result': lastMessage.content[ 0 ].text.value }
    }


    async askWithFile( { userMessage, fileString, assistantId } ) {
      // === 1. Upload file ===
        const uploadedFile = await this.#client.files.create( {
            file: new File([fileString], 'uploaded.txt'),
            purpose: 'assistants',
        } )
  
        console.log( `📁 File uploaded: ${uploadedFile.id}` )
    
        // === 2. Use existing assistant ===
        console.log( `🤖 Using Assistant: ${assistantId}` )
    
        // === 3. Create thread ===
        const thread = await this.#client.beta.threads.create();
        console.log(`🧵 Thread created: ${thread.id}`);
    
        // === 4. Add user message and file attachment ===
        console.log(`💬 Sending user message...`);
      await this.#client.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: [
              {
                  type: 'text',
                  text: userMessage,
              },
          ],
          attachments: [
              {
                  file_id: uploadedFile.id,
                  tools: [{ type: 'file_search' }],
              },
          ],
      });
  
      console.log('📨 Message sent to assistant.');
  
      // === 5. Start assistant run ===
      const run = await this.#client.beta.threads.runs.create(thread.id, {
          assistant_id: assistantId,
      });
  
      console.log('🏃‍♂️ Assistant is processing your request...');
  
      // === 6. Wait for completion ===
      let status;
      do {
          await new Promise((r) => setTimeout(r, 1000));
          status = await this.#client.beta.threads.runs.retrieve(thread.id, run.id);
          process.stdout.write(`⏳ Status: ${status.status.padEnd(10)}\r`);
      } while (status.status !== 'completed');
  
      console.log('\n✅ Assistant has completed the task!');
  
      // === 7. Fetch and display response ===
      const messages = await this.#client.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0];
  
      // console.log('\n💡 Assistant Response:\n');
      // console.log(lastMessage.content[0].text.value);
  
      // === 8. Clean up ===
      await this.#client.beta.threads.del(thread.id);
      console.log(`\n🗑️ Thread deleted: ${thread.id}`);
  
      await this.#client.files.del(uploadedFile.id);
      console.log(`🗑️ File deleted: ${uploadedFile.id}`);
  
      return {
          status: true,
          result: lastMessage.content[0].text.value,
      };
  }
  
}


export { AI }
