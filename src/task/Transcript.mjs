import { YoutubeTranscript } from 'youtube-transcript'


class Transcript {
    constructor() {}

    async fetch( { url } ) {
        const struct = {
            'status': true,
            'result': {
                'transcript': '',
                'videoId': ''
            }
        }

        let str = ''
        let videoId = ''

        try {
            const videoId = url
                .split( "v=" )[ 1 ]
                .split("&")[ 0 ]
            const transcriptRaw = await YoutubeTranscript
                .fetchTranscript( videoId )
            const transcript = transcriptRaw 
                .map( entry => entry.text )
                .join( "\n" )
            struct['result'] = { transcript, videoId }
        } catch (error) {
            struct['status'] = false
            console.error( "❌ Error fetching transcript:", error )
        }

        return struct
    }
}


export { Transcript }