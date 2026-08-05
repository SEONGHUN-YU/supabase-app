'use client';

import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

/**
 * `navigator.clipboard`를 쓸 수 없을 때의 폴백.
 *
 * Clipboard API는 보안 컨텍스트(HTTPS)에서만 노출되고, 카카오톡 인앱
 * 브라우저처럼 권한이 제한된 WebView에서는 호출이 거부되기도 한다.
 * 이 제품은 "카톡 공유 문구 복사"가 핵심 흐름이라 폴백이 선택 사항이 아니다.
 */
function copyWithFallback(text: string): boolean {
	const textarea = document.createElement('textarea');
	textarea.value = text;
	// 화면 밖으로 밀되 focus는 가능해야 하므로 display:none은 쓰지 않는다.
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.top = '-9999px';
	document.body.appendChild(textarea);

	try {
		textarea.select();
		// iOS Safari는 select()만으로 선택되지 않아 범위를 명시해야 한다.
		textarea.setSelectionRange(0, text.length);
		return document.execCommand('copy');
	} catch {
		return false;
	} finally {
		document.body.removeChild(textarea);
	}
}

interface CopyButtonProps {
	/** 복사할 원문 */
	text: string;
	/** 버튼에 표시할 문구 */
	label?: string;
	variant?: React.ComponentProps<typeof Button>['variant'];
	size?: React.ComponentProps<typeof Button>['size'];
	className?: string;
}

/** 초대 링크와 카톡 공유 문구 양쪽에서 쓰는 복사 버튼 */
export function CopyButton({
	text,
	label = '복사',
	variant = 'outline',
	size = 'sm',
	className,
}: CopyButtonProps) {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopy = async () => {
		let succeeded = false;

		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				succeeded = true;
			} catch {
				// 권한 거부·비보안 컨텍스트. 아래 폴백으로 넘어간다.
			}
		}

		if (!succeeded) {
			succeeded = copyWithFallback(text);
		}

		if (succeeded) {
			setIsCopied(true);
			toast.success('복사했습니다');
			window.setTimeout(() => setIsCopied(false), 2000);
		} else {
			toast.error('복사할 수 없습니다. 길게 눌러 직접 복사해 주세요');
		}
	};

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			onClick={handleCopy}
			className={className}
		>
			{isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
			{isCopied ? '복사됨' : label}
		</Button>
	);
}
