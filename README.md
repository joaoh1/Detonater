# Detonater

The Detonater is a tool written in TypeScript for compressing Fabric mods into even smaller ones. This tool is more useful for mods that add content. The compression is done by optimizing PNGs with oxipng's maximum compression level and by minifying the JSON and mcmeta files, the resulting jar file is then deflated with the maximum level, Jar-in-Jar dependencies are also compressed by this tool.

## Usage

In order to run this tool, you will need to have [Deno](https://deno.land/) and [oxipng](https://github.com/shssoichiro/oxipng) installed. After both are installed, there's two ways to use this tool:

One way is to provide a folder which the mods to be compressed with the following syntax:
`deno run --allow-read --allow-write --allow-run --unstable https://raw.githubusercontent.com/joaoh1/Detonater/1.0.0/mod.ts folder <path to the folder>`

Another is by giving it the path to the mod, done with the following syntax:
`deno run --allow-read --allow-write --allow-run --unstable https://raw.githubusercontent.com/joaoh1/Detonater/1.0.0/mod.ts file <path to the file>`

## License

This tool is licensed under the MIT license. You may give attribution to this project if you incorporate parts of this project's code. It's not required for the compressed mods.
