<?php

use App\Models\Room;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('room.{code}', function ($user, string $code) {
    $room = Room::where('code', $code)->first();

    if ($room && $room->players()->where('user_id', $user->id)->exists()) {
        return ['id' => $user->id, 'name' => $user->name];
    }

    return false;
});