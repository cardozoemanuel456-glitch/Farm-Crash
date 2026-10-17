<?php

namespace App\Http\Controllers;

use App\Events\GameStarted;
use App\Events\RoomUpdated;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    public function lobby()
    {
        return view('lobby');
    }

    public function create(Request $request)
    {
        $data = $request->validate(['nickname' => 'required|string|max:20']);
        $user = $this->guest($data['nickname']);

        $alphabet = str_split('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
        do {
            $code = collect($alphabet)->random(5)->implode('');
        } while (Room::where('code', $code)->exists());

        $room = Room::create(['code' => $code, 'host_id' => $user->id]);
        $room->players()->create(['user_id' => $user->id, 'nickname' => $data['nickname']]);

        return redirect()->route('rooms.show', $room->code);
    }

    public function join(Request $request)
    {
        $data = $request->validate([
            'nickname' => 'required|string|max:20',
            'code' => 'required|string|size:5',
        ]);

        $room = Room::where('code', strtoupper($data['code']))->first();
        if (! $room) {
            return back()->withErrors(['code' => 'Esa sala no existe']);
        }

        $user = $this->guest($data['nickname']);

        if (! $room->players()->where('user_id', $user->id)->exists()) {
            if ($room->status !== 'waiting') {
                return back()->withErrors(['code' => 'La partida ya comenzó']);
            }
            if ($room->players()->count() >= 4) {
                return back()->withErrors(['code' => 'La sala está llena']);
            }
            $room->players()->create(['user_id' => $user->id, 'nickname' => $data['nickname']]);
            broadcast(new RoomUpdated($room));
        }

        return redirect()->route('rooms.show', $room->code);
    }

    public function show(string $code)
    {
        $room = Room::where('code', $code)->firstOrFail();

        if (! Auth::check() || ! $room->players()->where('user_id', Auth::id())->exists()) {
            return redirect()->route('lobby');
        }

        return view('room', ['room' => $room, 'players' => $room->playersPayload()]);
    }

    public function character(Request $request, string $code)
    {
        $room = Room::where('code', $code)->firstOrFail();
        $data = $request->validate(['character' => 'required|in:cow,chicken,pig,scarecrow']);

        $taken = $room->players()
            ->where('character', $data['character'])
            ->where('user_id', '!=', Auth::id())
            ->exists();

        if ($taken) {
            return response()->json(['error' => 'Ese personaje ya está ocupado'], 422);
        }

        $room->players()->where('user_id', Auth::id())->update(['character' => $data['character']]);
        broadcast(new RoomUpdated($room));

        return response()->json(['ok' => true]);
    }

    public function start(string $code)
    {
        $room = Room::where('code', $code)->firstOrFail();
        abort_unless($room->host_id === Auth::id(), 403);

        if ($room->players()->count() < 2) {
            return response()->json(['error' => 'Se necesitan al menos 2 jugadores'], 422);
        }

        if ($room->players()->whereNull('character')->exists()) {
            return response()->json(['error' => 'Todos deben elegir personaje'], 422);
        }

        $room->update(['status' => 'playing']);
        broadcast(new GameStarted($room));

        return response()->json(['ok' => true]);
    }
    public function game(string $code)
    {
        $room = Room::where('code', $code)->firstOrFail();
        abort_unless(Auth::check() && $room->players()->where('user_id', Auth::id())->exists(), 403);

        return view('game', ['room' => $room, 'players' => $room->playersPayload()]);
    }

    private function guest(string $nickname): User
    {
        $user = Auth::user() ?? User::create([
            'name' => $nickname,
            'email' => Str::uuid() . '@guest.local',
            'password' => Str::random(32),
        ]);

        Auth::login($user);

        return $user;
    }
}