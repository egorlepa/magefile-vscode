const vscode = require('vscode')
const { exec } = require('child_process')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders) {
		return
	}
	const workspaceRoot = workspaceFolders[0].uri.fsPath

	let disposable = vscode.commands.registerCommand('extension.magefile', () => {
		exec("mage -l", { cwd: workspaceRoot }, (error, stdout) => {
			if (error) {
				vscode.window.showInformationMessage('Not a mage project')
				return
			}

			const targets = parseMakefileTargets(stdout)
			const quickPickItems = targets.map((v) => ({
				label: v.target,
				description: v.comment,
				command: `mage ${v.target}`
			}))
			if (quickPickItems.length > 0) {
				vscode.window.showQuickPick(quickPickItems, {
					placeHolder: 'Select a Mage target to run',
				}).then(selection => {
					const terminal = getTeminal(workspaceRoot)
					if (selection) {
						terminal.show()
						terminal.sendText(selection.command)
					}
				})
			} else {
				vscode.window.showInformationMessage('No targets found in the Magefile.')
			}
		})
	})

	context.subscriptions.push(disposable)
}

/**
 * @param {string} output
 */
function parseMakefileTargets(output) {
	let lines = output.split(/\r?\n/)
	const start = lines.findIndex((v) => { if (v === 'Targets:') return true })
	lines = lines.slice(start + 1)
	const end = lines.findIndex((v) => { if (v === '') return true })
	if (end != -1) {
		lines = lines.slice(0, end)
	}

	const targets = []

	for (let line of lines) {
		line = line.trimStart()
		const targetEnd = line.indexOf(' ')
		let target = line.substring(0, targetEnd)
		let isDefault = false
		if (target.endsWith('*')) {
			target = target.slice(0, -1)
			isDefault = true
		}
		const comment = line.slice(targetEnd + 1).trim()
		targets.push({ target: target, comment: comment, isDefault: isDefault })
	}
	return targets
}

/**
 * @param {string} cwd
 */
function getTeminal(cwd) {
	let terminal = vscode.window.terminals.find(t => t.name === 'Mage')
	if (!terminal) {
		terminal = vscode.window.createTerminal({ cwd: cwd, name: 'Mage' })
	}
	return terminal
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
