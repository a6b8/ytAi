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
        this.#addHeadline()
    }


    async refresh() {
        console.log( '' )
        console.log( '🔄 Restarting...' )

        await this.start()
    }


    async start() {
        const { url } = await this.#setYoutubeUrl()
        const { configFolderPath, envFilePath } = await this.#setConfigFolder()
        this.#state = { configFolderPath, envFilePath }
        const { processingMode } = await this.#setProcessingMode()
        const { aiProvider, aiCredentials } = await this.#getAiCredentials( { processingMode } )
        this.#ytGPT = new YouGPT( { aiProvider, aiCredentials } )

        if( processingMode === 'manageAssistant' ) {
            const { assistantCMD } = await this.#setAssistantCommand()
            if( assistantCMD === 'Create Assistant' ) {
                await this.#createAssistant()
            } else if( assistantCMD === 'Delete Assistant' ) {
                await this.deleteAssistant()
            }

            return await this.refresh()
        }

        const { outputFolderPath } = await this.#setOutputFolder()
        const files = {
            'status': false,
            'transript': null,
            'ai': null
        }

        if( processingMode === 'onlyTranscript' ) {
            const { status, result } = await this.#ytGPT
                .getTranscript( { url } )
            files['transcript'] = { status, result }
            files['status'] = status
        } else if( processingMode === 'transcriptAndAI' ) {
            const { assistantId, assistantName } = await this.#setAssistant( { aiProvider, aiCredentials } )
            const { userMessage } = await this.#setUserMessage( { assistantName } )
            const { status, transcript, ai } = await this.#ytGPT
                .transcriptToAI( { url, assistantId, userMessage } )
            files['transcript'] = { status, result: transcript }
            files['ai'] = { status, result: ai }
            files['status'] = status
        }
        this.#saveFiles( { outputFolderPath, files } )

        return await this.refresh()
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
                'choices': [ process.cwd(), defaultPath]
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


    async #createAssistant() {
        const { name, model, temperature, response_format } = this.#config['ai']['assistant']['default']

        const assistantFolderPath = path.join(
            this.#state['configFolderPath'],
            this.#config['cli']['assistantFolder']
        )
        
        const availableAssistants = fs.readdirSync(assistantFolderPath, { withFileTypes: true })
            .filter( dirent => dirent.isDirectory())
            .map( dirent => {
                const assistantPath = path.join( 
                    assistantFolderPath, 
                    dirent.name,
                    this.#config['cli']['instructionFolder'],
                    this.#config['cli']['instructionFile']
                )
                console.log( 'Assistant Path:', assistantPath )

                const instruction = fs.readFileSync( assistantPath, 'utf-8' )
                const result = [ 
                    [ dirent.name,     'name',            false  ], 
                    [ instruction,     'instructions',    false  ],
                    [ model,           'model',           true   ], 
                    [ temperature,     'temperature',     true   ], 
                    [ response_format, 'response_format', false  ],
                    [ [ { 'type': 'file_search' } ], 'tools', false ]
                ]

                return result
            } )

        const { assistantSelection } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'assistantSelection',
                'message': 'Select the assistant:',
                'choices': availableAssistants.map( ( assistant ) => assistant[ 0 ][ 0 ] )
            }
        ] )

        const values = availableAssistants
            .find( ( assistant ) => assistant[ 0 ][ 0 ] === assistantSelection )

        let assistantValues = {}
        for( const [ value, key, show ] of values ) {
            if( !show ) {
                assistantValues[ key ] = value
                continue
            }

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
    }


    async deleteAssistant() {
        const { data } = await this.#ytGPT.getAssistants()
        const list = data.map( ( { id, name } ) => [ name, id ] )
        const choices = list.map( ( [ name, id ] ) => name )

        if( choices.length === 0 ) {
            console.log( 'No assistants to delete' )
            return false
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

        return true

    }


    async #executeAssistantCommand( { assistantCMD } ) {


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

        return { 'assistantId': assistant.id, 'assistantName': assistantName }
    }


    async #setUserMessage( { assistantName } ) {
        const p = path.join(
            this.#state['configFolderPath'],
            this.#config['cli']['assistantFolder'],
            assistantName,
            this.#config['cli']['userInputFolder']
        )

        const choices = fs.readdirSync( p, { withFileTypes: true } )
            .filter( dirent => dirent.isFile() )
            .map( dirent => dirent.name )

        const { userSelection } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'userSelection',
                'message': 'Select the user message:',
                'choices': choices
            }
        ] )

        const userMessage = fs
            .readFileSync( path.join( p, userSelection ), 'utf-8' )
            .trim()

        return { userMessage }
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


    #saveFiles( { outputFolderPath, files } ) {
        const { status, transcript, ai } = files
        if( !status ) { return false }

        const fileName = transcript['result']['videoId']
        const transcriptContent = transcript['result']['transcript']
        const filePath = path.join( outputFolderPath, fileName + '.txt' )
        fs.writeFileSync( filePath, transcriptContent, 'utf-8' )
        console.log( '📝 Transcript saved:', filePath )

        if( ai !== null ) {
            if( ai['status'] === false ) { return false }   
            const aiFileName = fileName + '.md'
            const aiContent= ai['result']
            const aiFilePath = path.join( outputFolderPath, aiFileName )
            fs.writeFileSync( aiFilePath, aiContent, 'utf-8' )
            console.log( '🧠 AI saved:', aiFilePath )
        }

        return true
    }

}

export { CLI }
