import {
	streamDeck,
	action,
	KeyDownEvent,
	SingletonAction,
	WillAppearEvent,
	WillDisappearEvent,
	KeyAction, DialAction
} from "@elgato/streamdeck";

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: "de.fourconnected.mediacenter.dmx-control.activatepreset" })
export class ActivatePreset extends SingletonAction<ActivatePresetSettings> {

	constructor() {
		super();

		setInterval(this.checkFunction.bind(this), 200);
	}

	async checkFunction() : Promise<void> {
		for (const action of this.actions) {
			const settings = await action.getSettings();
			const url = 'http://' + `${settings.host ?? 'localhost'}` + ':' + `${settings.portNo ?? 8089}` + '/get/' + `${settings.presetNo ?? 1}`;

			try {
				const response = await fetch(url);
				const data = await response.json() as { title: string; current: boolean; comment: string; };

				const title = `${settings.presetNo ?? 1}` + "\n" + data.title;
				if (title !== settings.title) {
					await action.setTitle(title);
					settings.title = title;
				}

				if (data.current !== settings.active) {
					await this.setActivatedKey(data.current, action);
					settings.active = data.current;
				}
			} catch (e: unknown) {
				await action.showAlert();
			}
		}
	}

	async setActivatedKey(activate: boolean, action: DialAction<ActivatePresetSettings> | KeyAction<ActivatePresetSettings>): Promise<void> {
		if ("setState" in action) {
			if (activate) {
				await action.setState(1);
			} else {
				await action.setState(0);
			}
		}
	}

	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link ActivatePreset.onKeyDown}.
	 */
	override onWillAppear(ev: WillAppearEvent<ActivatePresetSettings>): void | Promise<void> {
		streamDeck.logger.info("Appear");
		ev.payload.settings.active = false;
		return ev.action.setTitle('Preset ' + `${ev.payload.settings.presetNo ?? 1}`);
	}

	override onWillDisappear(ev: WillDisappearEvent<ActivatePresetSettings>): void | Promise<void> {
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
	 * settings using `setSettings` and `getSettings`.
	 */
	override async onKeyDown(ev: KeyDownEvent<ActivatePresetSettings>): Promise<void> {
		// Update the count from the settings.
		const { settings } = ev.payload;

		const url = 'http://' + `${ev.payload.settings.host ?? 'localhost'}` + ':' + `${ev.payload.settings.portNo ?? 8089}` + '/activate/' + `${ev.payload.settings.presetNo ?? 1}`;
		await fetch(url);

		for (const action of this.actions) {
			this.setActivatedKey(false, action);
		}

		this.setActivatedKey(true, ev.action);
	}
}

/**
 * Settings for {@link ActivatePreset}.
 */
type ActivatePresetSettings = {
	host?: string;
	portNo?: number;
	presetNo?: number;
	title?: string;
	active?: boolean;
};
