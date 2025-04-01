const userConfig = {
    'output': {
        'folder': '~/.../new',
        'setFolderAutomatically': true
    },
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
        }
    }
}


export { userConfig }