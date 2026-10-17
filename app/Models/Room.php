<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = ['code', 'host_id', 'status'];

    public function players()
    {
        return $this->hasMany(RoomPlayer::class);
    }

    public function playersPayload(): array
    {
        return $this->players()->get()
            ->map(fn ($p) => [
                'user_id' => $p->user_id,
                'nickname' => $p->nickname,
                'character' => $p->character,
            ])->values()->all();
    }
}