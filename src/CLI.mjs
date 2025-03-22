import inquirer from 'inquirer'
import figlet from 'figlet'
import chalk from 'chalk'
import fs from 'fs'

import os from 'os'
import path from 'path'
import { YouGPT } from './index.mjs'
import { config } from './data/config.mjs'
import { modifyPath, envToObject } from './helpers/utils.mjs'
import readline from 'readline'



class CLI {
    #config
    #ytGPT
    #state


    constructor() {
        this.#config = config
        this.#state = {}

    }


    async start() {
        this.#addHeadline()
        const { url } = await this.#setYoutubeUrl()
        const { configFolderPath, envFilePath } = await this.#setConfigFolder()
        this.#state = { configFolderPath, envFilePath }
        const { processingMode } = await this.#setProcessingMode()
        const { aiProvider, aiCredentials } = await this.#getAiCredentials( { processingMode } )
        this.#ytGPT = new YouGPT( { aiProvider, aiCredentials } )


        if( processingMode === 'manageAssistant' ) {
            const { assistantCMD } = await this.#setAssistantCommand()
            const { result } = await this.#executeAssistantCommand( { assistantCMD } )
            return true
        }

        const { outputFolderPath } = await this.#setOutputFolder()
        if( processingMode === 'transcriptAndAI' ) {
            const { assistantId } = await this.#setAssistant( { aiProvider, aiCredentials } )
            await this.#ytGPT.start( { url, assistantId } )
        }

        return true
    }


    #addHeadline() {
        const { text, params } = this.#config['cli']['headline']
        console.log( chalk.green( 
            figlet.textSync( text, params ) 
        ) )

        return true
    }


    async #setConfigFolder() {
        const { configFolder } = this.#config['cli']
        const defaultPath = modifyPath( { 'path': configFolder } )

        // create a prompt to ask the user for the config folder

        const { configFolderPath } = await inquirer.prompt( [
            {
                'type': 'input',
                'name': 'configFolderPath',
                'message': 'Enter the config folder path:',
                'default': defaultPath
            }
        ] )

        const envFilePath = path.join( 
            configFolderPath, 
            this.#config['cli']['envName'] 
        )

        if( fs.accessSync( envFilePath, fs.constants.R_OK ) ) {
            console.log( 
                chalk.red( 
                    `File ${envPath} does not exist or is not readable` 
                ) 
            )
            process.exit( 1 )
        }

        return { configFolderPath, envFilePath }
    }


    async #setOutputFolder() {
        const { outputFolder } = this.#config['cli'] 
        const defaultPath = modifyPath( { 'path': outputFolder } )

        const { selection } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'selection',
                'message': 'Select the output folder path:',
                'choices': [ defaultPath, process.cwd() ]
            }
        ] )

        readline.moveCursor( process.stdout, 0, -1 )
        readline.clearLine( process.stdout, 0 )
        readline.cursorTo( process.stdout, 0 )

        const { outputFolderPath } = await inquirer.prompt( [
            {
                'type': 'input',
                'name': 'outputFolderPath',
                'message': 'Enter the output folder path:',
                'default': selection
            }
        ] )
              




        return { outputFolderPath }
    }


    async #setProcessingMode() {
        const { processingModes, processingModeDefault } = this.#config['cli']
        const choices = processingModes.map( ( [ ,name ] ) => name )
        const _default = choices[ 
            processingModes.findIndex( ( [ cmd, ] ) => cmd === processingModeDefault )
        ]

        const { processingModeCMD } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'processingModeCMD',
                'message': 'Select the processing mode:',
                choices,
                'default': _default
            }
        ] )

        const processingMode = processingModes
            .find( ( [ cmd, name ] ) => name === processingModeCMD )[ 0 ]

        return { processingMode }
    }


    async #setAssistantCommand() {
        const { assistantCMD } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'assistantCMD',
                'message': 'Select the assistant command:',
                'choices': [ 'Create Assistant', 'Delete Assistant' ]
            }
        ] )

        return { assistantCMD }
    }


    async #executeAssistantCommand( { assistantCMD } ) {
        if( assistantCMD === 'Create Assistant' ) {
            const { name, model, temperature, response_format } = this.#config['ai']['assistant']['default']

            const values = [ 
                [ name,            'name'            ], 
                [ '',              'instructions'    ],
                [ model,           'model'           ], 
                [ temperature,     'temperature'     ], 
                [ response_format, 'response_format' ],
            ]

            let assistantValues = {}
            for( const [ value, key ] of values ) {
                const { newValue } = await inquirer.prompt( [
                    {
                        'type': 'input',
                        'name': 'newValue',
                        'message': `Enter the value for ${key}:`,
                        'default': value
                    }
                ] )
                assistantValues[ key ] = newValue
            }
            assistantValues['tools'] = [ { 'type': 'file_search' } ]
            this.#ytGPT.createAssistant( assistantValues )
        } else if( assistantCMD === 'Delete Assistant' ) {
            const { data } = await this.#ytGPT.getAssistants()
            const list = data.map( ( { id, name } ) => [ name, id ] )
            const choices = list.map( ( [ name, id ] ) => name )

            if( choices.length === 0 ) {
                console.log( 'No assistants to delete' )
                process.exit( 1 )
            }

            const { assistantIdName } = await inquirer.prompt( [
                {
                    'type': 'list',
                    'name': 'assistantIdName',
                    'message': 'Select the assistant to delete:',
                    choices
                }
            ] )
            const assistantId = list
                .find( ( [ name, id ] ) => name === assistantIdName )[ 1 ]

            this.#ytGPT.deleteAssistant( { assistantId } )



            console.log( 'Delete Assistant' )
        }

        return true
    }



    async #getAiCredentials( { processingMode } ) {
        let aiProvider = null
        let aiCredentials = {}

        aiProvider = 'openai' // a1['aiProvider']

        const selection = Object
            .entries( this.#config['ai']['providers'][ aiProvider ]['env'] )
            .map( ( [ nodeVar, { name: envVar, type: nodeType } ] ) => {
                return [ nodeVar, envVar, nodeType ]
            } )
        const { envFilePath } = this.#state

        const envContent = fs.readFileSync( envFilePath, 'utf-8' )
        aiCredentials = envToObject( { envContent, selection } )


        return { aiProvider, aiCredentials }
    }


/*
    async #setAIProvider() {
        const { providers, defaultProvider } = this.#config['ai']
        const { aiProvider } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'aiProvider',
                'message': 'Select the AI provider:',
                'choices': Object.keys( providers ),
                'default': defaultProvider
            }
        ] )

        return { aiProvider }
    }
*/

    async #setAssistant( { aiProvider, aiCredentials } ) {
        const assistants = await this.#ytGPT.getAssistants()
        const choices = assistants['data'].map( ( { id, name } ) => name )
        const { assistantName } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'assistantName',
                'message': 'Select the assistant:',
                'choices': choices
            }
        ] )

        const assistant = assistants['data']
            .find( ( { name } ) => name === assistantName )
        return { 'assistantId': assistant.id }
    }



    async #setYoutubeUrl() {
        const { url } = await inquirer.prompt( [
            {
                'type': 'input',
                'name': 'url',
                'message': 'Enter the YouTube Video URL:',
                'validate': ( value ) => value.includes('youtube.com/watch?v=') ? true : 'Please enter a valid YouTube URL',
                'default': 'https://www.youtube.com/watch?v=3DYEnch-2is'
            }
        ] )
        
        return { url }
    }
}

export { CLI }
