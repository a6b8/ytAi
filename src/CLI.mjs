import inquirer from 'inquirer'
import figlet from 'figlet'
import chalk from 'chalk'
import fs from 'fs'

import os from 'os'
import path from 'path'

import { YouGPT } from './index.mjs'
import { config } from './data/config.mjs'
import { modifyPath, envToObject, getKeyValueFromUrl } from './helpers/utils.mjs'
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
        const { videoId } = await this.#setYoutubeUrl()
        const { configFolderPath, envFilePath, userConfig } = await this.#setConfigFolder()
        this.#state = { configFolderPath, envFilePath, userConfig }
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

        const { outputFolderPath } = await this
            .#setOutputFolder()
        const { assistantId, assistantName, createTransscript, enableFileSelection } = await this
            .#setAssistant( { aiProvider, aiCredentials } )
        const { userMessage } = await this
            .#setUserMessage( { assistantName } )

        const fileStrings = []
        if( createTransscript ) {
            const { status, result } = await this.#ytGPT
                .getTranscript( { videoId } )
            if( status === false ) {
                console.log( '❌ Error fetching transcript' )
                return await this.refresh()
            }
            fileStrings.push( result )
        }

        if( enableFileSelection ) {
            const { additionalFileStrings } = await this
                .#setAdditionalFiles( { videoId, outputFolderPath, assistantName } )
            fileStrings.push( ...additionalFileStrings )
        }

        const { status, result: aiAnswer } = await this.#ytGPT
            .getAi( { userMessage, fileStrings, assistantId } )

        this.#saveFiles( { 
            outputFolderPath, 
            videoId,  
            assistantName, 
            aiAnswer, 
            fileStrings, 
            createTransscript 
        } )

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
        const { configFolder, userConfigName } = this.#config['environment']
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
            this.#config['environment']['envName'] 
        )

        if( fs.accessSync( envFilePath, fs.constants.R_OK ) ) {
            console.log( 
                chalk.red( 
                    `File ${envPath} does not exist or is not readable` 
                ) 
            )
            process.exit( 1 )
        }

        const configPath = path.join( configFolderPath, userConfigName )
        if( fs.accessSync( configPath, fs.constants.R_OK ) ) {
            console.log( 
                chalk.red( 
                    `File ${configPath} does not exist or is not readable`
                ) 
            )
            process.exit( 1 )
        }
        const { userConfig } = await import( configPath )

        return { configFolderPath, envFilePath, userConfig }
    }


    async #setOutputFolder() {
        const { outputFolder } = this.#config['environment'] 
        const defaultPath = modifyPath( { 'path': outputFolder } )

        const { defaultFolder } = this.#state['userConfig']
        const userFolder = modifyPath( { 'path': defaultFolder } )

        const { selection } = await inquirer.prompt( [
            {
                'type': 'list',
                'name': 'selection',
                'message': 'Select the output folder path:',
                'choices': [ userFolder, process.cwd(), defaultPath  ]
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
        const { response_format } = this.#config['ai']['assistant']['default']
        const { model, temperature } = this.#state['userConfig']['openai']

        const assistantFolderPath = path.join(
            this.#state['configFolderPath'],
            this.#config['environment']['assistantFolder']
        )
        
        const availableAssistants = fs.readdirSync(assistantFolderPath, { withFileTypes: true })
            .filter( dirent => dirent.isDirectory())
            .map( dirent => {
                const assistantPath = path.join( 
                    assistantFolderPath, 
                    dirent.name,
                    this.#config['environment']['instructionFolder'],
                    this.#config['environment']['instructionFile']
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


    async #setAssistant( { aiProvider, aiCredentials } ) {
        const assistants = await this.#ytGPT.getAssistants()
        const choices = assistants['data'].map( ( { id, name } ) => name )
        const { userConfig } = this.#state
        const { activeAssistants } = userConfig

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
        const { createTransscript, enableFileSelection } = activeAssistants[ assistantName ]

        return { 
            'assistantId': assistant.id, 
            'assistantName': assistantName, 
            createTransscript, 
            enableFileSelection 
        }
    }


    async #setUserMessage( { assistantName } ) {
        const p = path.join(
            this.#state['configFolderPath'],
            this.#config['environment']['assistantFolder'],
            assistantName,
            this.#config['environment']['userInputFolder']
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


    async #setAdditionalFiles( { videoId, outputFolderPath, assistantName } ) {
        const { fileSelectionRequired } = this.#state['userConfig']['activeAssistants'][ assistantName ]
        const p = path.join( outputFolderPath, videoId )
        if( fs.existsSync( p ) === false ) {
            if( fileSelectionRequired ) {  
                console.log( 'Folder does not exist, but is required:', p )
                return await this.refresh() 
            }
            return { 'additionalFileStrings': [] }
        }

        const matches = this.#state['userConfig']['activeAssistants'][ assistantName ]['files']
        const choices = fs
            .readdirSync( p, { withFileTypes: true } )
            .map( dirent => {
                const { name, path } = dirent
                const checked = matches.some( ( regex ) => regex.test( name ) )
                const struct = { name, path, checked }

                return struct
            } )

        const { fileSelection } = await inquirer.prompt( [
            {
                'name': 'Select additional files:',
                'type': 'checkbox',
                'name': 'fileSelection',
                'message': 'Select additional files:',
                choices
            }
        ] )

        const additionalFileStrings = fileSelection
            .map( ( fileName ) => {
                const{ path: _path } = choices
                    .find( ( { name } ) => name === fileName )
                const p =  path.join( _path, fileName )
                const content = fs.readFileSync( p, 'utf-8' )

                return content
            } )  
        
        return { additionalFileStrings }
    }


    async #setYoutubeUrl() {
        const { input } = await inquirer.prompt( [
            {
                'type': 'input',
                'name': 'input',
                'message': 'Enter the YouTube Video URL:',
                'validate': ( value ) => {
                    const isFullUrl = value.includes( 'youtube.com/watch?v=' )
                    const isVideoId = /^[\w-]{11}$/.test( value )
                    if (isFullUrl || isVideoId) { return true }

                    return 'Please enter a valid YouTube URL or Video ID (11 characters)';
                },
                'default': 'https://www.youtube.com/watch?v=3DYEnch-2is'
            }
        ] )

        let videoId = ''
        if( input.includes( 'youtube.com/watch?v=' ) ) {
            const { v } = getKeyValueFromUrl( { 'url': input } )
            videoId = v
        } else {
            videoId = input
        }

        return { videoId }
    }


    #saveFiles( { outputFolderPath, videoId,  assistantName, aiAnswer, fileStrings, createTransscript } ) {
        const p = path.join( outputFolderPath, videoId )
        if( fs.existsSync( p ) === false ) {
            fs.mkdirSync( p, { recursive: true } )
        }

        const { suffix } = this.#state['userConfig']['activeAssistants'][ assistantName ]
        const filePaths = [
            createTransscript ? [ 'transcript.txt', fileStrings[ 0 ] ] : null,
            [ `${assistantName}${suffix}`, aiAnswer ]
        ]
            .filter( ( a ) => a !== null )
            .map( ( a ) => {
                const [ name, content ] = a
                const _p = path.join( p, name )

                let str = ''
                str += `https://www.youtube.com/watch?v=${videoId}\n`
                // str += `Assistant: ${assistantName}\n\n`
                str += `\n\n---\n\n`
                str += content

                if( fs.existsSync( _p ) ) {
                    console.log( 'File exists:', _p )
// generate unix timestamp
                    const unixTimestamp = new Date().getTime()
                    const [ name, ext ] = _p.split( '.' )
                    const __p = `${name}--${unixTimestamp}.${ext}`
                    fs.writeFileSync( __p, str, 'utf-8' )

                    return __p
                }



                fs.writeFileSync( _p, str, 'utf-8' )
                return _p
            } )

        return filePaths
    }

}

export { CLI }
