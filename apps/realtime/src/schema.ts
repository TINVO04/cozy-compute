import { MapSchema, Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') userId = '';
  @type('string') name = '';
  @type('string') title = '';
  @type('string') status = '';
  @type('string') appearance = '{}';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('int8') dir = 0; // 0 down, 1 left, 2 right, 3 up
  @type('boolean') moving = false;
  @type('string') vehicle = '';
  @type('uint32') seq = 0;
  @type('number') inputElapsedMs = 0;
  @type('number') speed = 150;
  @type('string') emote = '';
  @type('number') emoteAt = 0;
  @type('boolean') connected = true;
  @type('boolean') inEvent = false;
}

export class DuckState extends Schema {
  @type('number') x = 0;
  @type('number') y = 0;
}

export class EventState extends Schema {
  @type('string') id = '';
  @type('string') title = '';
  @type('number') endsAt = 0;
  @type({ map: DuckState }) ducks = new MapSchema<DuckState>();
  @type({ map: 'uint16' }) scores = new MapSchema<number>();
}

export class TownActorState extends Schema {
  @type('string') id = '';
  @type('string') kind = '';
  @type('uint8') variant = 0;
  @type('string') mode = '';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('int8') dir = 0;
  @type('boolean') moving = false;
  @type('number') altitude = 0;
  @type('string') speech = '';
}

export class RoomState extends Schema {
  @type('number') simulationTime = 0;
  @type({ map: TownActorState }) townActors = new MapSchema<TownActorState>();
  @type('number') serverTime = 0;
  @type('string') kind = 'town';
  @type('string') label = '';
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(EventState) event: EventState | undefined;
}
