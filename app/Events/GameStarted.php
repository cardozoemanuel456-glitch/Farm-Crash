<?php

namespace App\Events;

use App\Models\Room;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class GameStarted implements ShouldBroadcastNow
{
    public function __construct(public Room $room) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel('room.' . $this->room->code)];
    }

    public function broadcastAs(): string
    {
        return 'game.started';
    }
}