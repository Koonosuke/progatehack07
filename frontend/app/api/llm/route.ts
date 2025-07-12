import { NextResponse } from 'next/server';

export async function POST(request: Request){
	const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
	try{
		const { words } = await request.json();

		if(!words || !Array.isArray(words) || words.length === 0){
			return NextResponse.json({error: '単語リストが無効です。'}, { status: 400});
		}
		//プロンプト
		const prompt = `あなたは今一対一通話のサポーターです．対象者はろう者です．対象者がした手話から以下の単語リストを生成しました．\n\n単語リスト: ${words.join(',')}\n\n手話の特性を考慮しつつ，単語リストを参考に文脈を補ってなめらかな文章を生成してください。ただし推測した文章以外は出力しないでください．\n例: "このユーザは「飲み会にいこう」と言っています\n →飲み会に行こう "\n\n<Ollama>`

		//APIリクエスト送信
		const response = await fetch(`${API_BASE_URL}/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body : JSON.stringify({prompt}),
		});

		if(!response.ok){
			const errorText = await response.text();
			throw new Error(`APIからのエラー: ${response.statusText}-${errorText}`);
		}

		const data = await response.json();
		console.log(data);
		return NextResponse.json({ generatedText: data.generated_text});
	} catch (error){
		console.error('LLM API Error: ', error);
		return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。'}, { status: 500});
	}
}