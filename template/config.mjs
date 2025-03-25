const userConfig = {
    'defaultFolder': '~/PROJEKTE/2025-03-19--trading-strategies/2-strategies/abc',
    'openai': {
        'model': 'gpt-4o',
        'temperature': 0.7,
        'max_tokens': 1000
    },
    'activeAssistants': {
        'to_pine_script': {
            'createTransscript': true,
            'enableFileSelection': false,
            'fileSelectionRequired': false,
            'suffix': '.md',
            'user_input': {
                'autoselect': /^tutorial_to_pine_script\.txt$/
            },
            'files': []
        },
        'to_tradingview': {
            'createTransscript': false,
            'enableFileSelection': true,
            'fileSelectionRequired': true,
            'suffix': '.md',
            'user_input': {},
            'files': [ /^to_pine_script.*$/ ]
            // 'files': [ /^to_pine_script\.md$/ ]
        }
    }
}


export { userConfig }