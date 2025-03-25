const config = {
    'environment': {
        'envName': 'cred.env',
        'userConfigName': 'config.mjs',
        'configFolder': '~/.ytGPT',
        'assistantFolder': 'assistants/',
        'instructionFolder': 'instruction/',
        'instructionFile': 'instruction.txt',
        'userInputFolder': 'user_input/',
        'outputFolder': '~/Desktop'
    },
    'cli': {
        'processingModeDefault': 'transcriptAndAI',
        'processingModes': [ 
            // [ 'onlyTranscript',  '📝 Only Transcript'   ],
            [ 'start', '🧠 START' ],
            // [ 'onlyAI',         '🧠 Onyl use Assistant'            ],
            [ 'manageAssistant', '🧩 Manage Assistant'  ] 
        ],
        'headline': {
            'text': 'ytAi',
            'params': { 
                'horizontalLayout': 'full',
                'font': 'Slant' 
            }
        }
    },
    'ai': {
        'defaultProviders': 'openai',
        'providers': {
            'openai': {
                'env': {
                    'api_key': {
                        'name': 'OPENAI_API_KEY',
                        'type': 'string'
                    },
                    'model': {
                        'name': 'OPENAI_MODEL',
                        'type': 'string'
                    },
                    'temperature': {
                        'name': 'OPENAI_TEMPERATURE',
                        'type': 'float'
                    },
                    'max_tokens': {
                        'name': 'OPENAI_MAX_TOKENS',
                        'type': 'integer'
                    }
                }
            }
        },
        'assistant': {
            'default': {
                'response_format': 'auto' 
            }
        }
    }
}


export { config }