<?php

use App\Http\Controllers\RoomController;

Route::get('/', [RoomController::class, 'lobby'])->name('lobby');
Route::post('/rooms', [RoomController::class, 'create'])->name('rooms.create');
Route::post('/rooms/join', [RoomController::class, 'join'])->name('rooms.join');
Route::get('/rooms/{code}', [RoomController::class, 'show'])->name('rooms.show');
Route::post('/rooms/{code}/character', [RoomController::class, 'character']);
Route::post('/rooms/{code}/start', [RoomController::class, 'start']);
Route::get('/game/{code}', [RoomController::class, 'game'])->name('game');