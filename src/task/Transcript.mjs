import { YoutubeTranscript } from 'youtube-transcript'
import he from 'he'


class Transcript {
    constructor() {}


    async fetch( { videoId } ) {
        const struct = {
            'status': true,
            'result': {
                'transcript': '',
                'videoId': ''
            }
        }

        try {
/*
            const videoId = url
                .split( "v=" )[ 1 ]
                .split("&")[ 0 ]
*/
            const transcriptRaw = await YoutubeTranscript
                .fetchTranscript( videoId )

/*
            const transcript = transcriptRaw 
                .map( entry => entry.text )
                .join( "\n" )
*/

            const transcript = transcriptRaw 
                .map( ( item ) => {
                    const { text, offset } = item
                    const decodedText = he.decode( text )
                    const timestamp = this.#offsetToTime( offset )
                    const str = `[${timestamp}] ${decodedText}`

                    return str
                } )
                .join( "\n" )

            struct['result'] = transcript
        } catch (error) {
            struct['status'] = false
            console.error( "❌ Error fetching transcript:", error )
        }

        return struct
    }


    #offsetToTime(seconds) {
        const date = new Date( 0 )
        date.setSeconds( seconds )
        return date.toISOString().substr( 11, 8 ) 
    }
}


export { Transcript }