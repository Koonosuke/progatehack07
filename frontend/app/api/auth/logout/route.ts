import { serialize } from 'cookie';
import { NextResponse } from 'next/server';

export async function POST() {
	const serializedCookie = serialize('auth_token', '', {
		httpOnly: true,
		secure: process.env.NODE_ENV !== 'development',
		sameSite: 'strict',
		maxAge: -1,
		path: '/',
	});

	return NextResponse.json(
		{ message: 'Logout successful' },
		{
			status: 200,
			headers: { 'Set-Cookie': serializedCookie },
		}
	);
}