export { 
    PLUGIN_TITLE, 
    PLUGIN_VERSION,
    PLUGIN_NAME, 
    RISU_ARGS, 
    ARG1, 
    ARG2,
    RisuArgType
};

enum RisuArgType {
    String = 'string',
    Int = 'int',
}

interface RisuArgs {
    [key: string]: RisuArgType;
}

// Plugin Info
const PLUGIN_TITLE = 'my-plugin'
const PLUGIN_VERSION = 'v1.0.0' 
const PLUGIN_NAME = `${PLUGIN_TITLE}-${PLUGIN_VERSION}`

// Argument Name Definitions
const ARG1 = 'my_arg1'
const ARG2 = 'my_arg2'

// Plugin Arguments Definition
const RISU_ARGS: RisuArgs = {
    [ARG1]: RisuArgType.String,
    [ARG2]: RisuArgType.Int,
}
