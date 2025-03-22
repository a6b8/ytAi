import os from 'os'


function modifyPath( { path } ) {
    const homeDir = os.homedir()
    if( path.startsWith( '~' ) ) {
        return path.replace( '~', homeDir )
    } {
        return path
    }
}


function envToObject( { envContent, selection } ) {
    /*
        const selection = [
            [ 'privateKey', 'SOLANA_PRIVATE_KEY',     'string' ],
            [ 'publicKey',  'SOLANA_PUBLIC_KEY'       'string' ],
            [ 'apiKey',     'SOLANA_TRACKER_API_KEY', 'string' ],
            [ 'nodeUrl',    'SOLANA_MAINNET_HTTPS',   'string' ]
        ]
    */

    const found = envContent
        .split( "\n" )
        .map( line => line.split( '=' ) )
        .reduce( ( acc, [ k, v, t ], i ) => {
            const find = selection.find( ( [ key, value ] ) => value === k )
            if( find ) { 
                switch( find[ 2 ] ) {
                    case 'string':
                        break
                    case 'integer':
                        v = parseInt( v )
                        break
                    case 'float':
                        v = parseFloat( v )
                        break
                    default:
                        console.log( 'Unknown type:', t )
                        break
                }
                acc[ find[ 0 ] ] = v 
            }
            return acc
        }, {} )

    const result = selection
        .reduce( ( acc, [ name, key, type ], index ) => {
            if( Object.hasOwn( acc, name ) ) { return acc }
            acc[ name ] = undefined

            return acc
        }, found )

    return result
}


export { modifyPath, envToObject}