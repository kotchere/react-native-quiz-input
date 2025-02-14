import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import { View, NativeSyntheticEvent, TextInputKeyPressEventData, NativeModules, StyleSheet } from 'react-native';
import chunk from 'lodash.chunk';


export type TWordArray = ReadonlyArray<string | boolean>;

export type TCallbackData = {
    wordArray: TWordArray;
    wordString: string;
};

type TWordStructure = ReadonlyArray<boolean>;

type TLineBreakOnSpace = boolean;

type TSmartChunkedArray = ReadonlyArray<TWordStructure>;

type TAllowedSizes = 'small' | 'medium' | 'large';

type TIndividualCharsInput = {
    wordStructure: TWordStructure;
    autoFocus?: boolean;
    maxBoxesPerLine?: number;
    lineBreakOnSpace?: TLineBreakOnSpace;
    borderColor?: string;
    backgroundColor?: string;
    textColor?: string;
    size?: TAllowedSizes;
    inputStyle: object;
    onChange: ( inputContent: TCallbackData ) => void;
};

type TSizeRelatedProps = {
    width: number;
    height: number;
    borderRadius: number;
    marginLeft: number;
    marginRight: number;
};

const DEFAULT_PROPS = {
    autoFocus: true,
    maxBoxesPerLine: 0,
    lineBreakOnSpace: false,
    borderColor: '#BBBBBB',
    backgroundColor: 'transparent',
    textColor: '#000000',
    size: 'medium',
    inputStyle: {}
} as Partial<TIndividualCharsInput>;

const getSizeRelatedProps = ( size: TAllowedSizes ): TSizeRelatedProps => {
    switch ( size ){
        case 'medium':
        default:
            return {
                width: 26,
                height: 34,
                borderRadius: 7,
                marginLeft: 1,
                marginRight: 1
            };
        case 'small':
            return {
                width: 22,
                height: 28,
                borderRadius: 5,
                marginLeft: 1,
                marginRight: 1
            };
        case 'large':
            return {
                width: 30,
                height: 38,
                borderRadius: 8,
                marginLeft: 1,
                marginRight: 1
            };
    }

};

export const transformWordStructureToTemplateArray = ( wordStructure: TWordStructure ): TWordArray => {

    return wordStructure.map( ( singleLetter ) => {
        if ( singleLetter ) {
            return '';
        } else {
            return false;
        }
    } );
};

export const transformWordStructureToString = ( wordStructure: TWordStructure ): string => {

    return wordStructure.map( ( singleLetter ) => {
        if ( singleLetter ) {
            return 'L';
        } else {
            return 'S';
        }
    } ).join( '' );
};

export const transformStringWordStructureToSArr = ( wordStructureAsString: ReadonlyArray<string> ): TSmartChunkedArray => {

    return wordStructureAsString.map( ( singleBlock ) => {
        const singleBlockAsArr = singleBlock.split( '' );
        return singleBlockAsArr.map( ( singleLetter ) => ( singleLetter === 'L' ? true : false ) );
    } );
};

export const getSmartChunkedArray = (
    wordStructure: TWordStructure,
    lineBreakOnSpace: TLineBreakOnSpace,
    maxBoxesPerLine: number,
): TSmartChunkedArray => {

    if ( maxBoxesPerLine <= 0  && !lineBreakOnSpace ) {
        return [ wordStructure ];
    }

    if ( maxBoxesPerLine > 0 && !lineBreakOnSpace ) {
        return chunk( wordStructure, maxBoxesPerLine );
    }

    // If we are here it means that lineBreakOnSpace is true
    // other then creating chunk for lines, we still take into account maxBoxesPerLine
    // and split the line when needed

    const wordStructureAsString = transformWordStructureToString( wordStructure );
    const spaceChunks = wordStructureAsString.split( 'S' );

    const spaceChunksWithSpaceRow = [] as string[];

    spaceChunks.forEach( ( spaceChunk, index ) => {
        spaceChunksWithSpaceRow.push( spaceChunk );

        if ( index < spaceChunks.length - 1 ) {
            spaceChunksWithSpaceRow.push( 'S' );
        }
    } );

    const processedSpaceChunks = spaceChunksWithSpaceRow.map( ( singleChunk ) => {
        if ( singleChunk.length <= maxBoxesPerLine || maxBoxesPerLine === 0 ) {
            return singleChunk;
        } else {
            return chunk( singleChunk, maxBoxesPerLine );
        }
    } );

    const flattenedArray = [] as string[];

    processedSpaceChunks.forEach( ( singleChunk ) => {
        if ( Array.isArray( singleChunk ) ) {
            singleChunk.forEach( ( nestedChunk ) => {
                flattenedArray.push( nestedChunk.join( '' ) );
            } );
        } else {
            flattenedArray.push( singleChunk );
        }
    } );

    const reconstructedArr = transformStringWordStructureToSArr( flattenedArray );

    return reconstructedArr;
};

export const getNextValidIndex = ( wordStructure: TWordStructure, currentIndex: number ): number => {

    if ( currentIndex >= wordStructure.length - 1 ) {
        return -1;
    }

    if ( wordStructure[ currentIndex + 1 ] ) {
        return currentIndex + 1;
    }

    return getNextValidIndex( wordStructure, currentIndex + 1 );
};

export const getPreviousValidIndex = ( wordStructure: TWordStructure, currentIndex: number ): number => {

    if ( currentIndex <= 0 ) {
        return currentIndex;
    }

    if ( wordStructure[ currentIndex - 1 ] ) {
        return currentIndex - 1;
    }

    return getPreviousValidIndex( wordStructure, currentIndex - 1 );
};

export const getWordStringForExternalMethod = ( newWordArray: TWordArray ): string => {

    const processedArr = [];

    for ( let count = 0; count < newWordArray.length; count++ ) {
        const currentLetter = newWordArray[ count ];

        switch ( currentLetter ) {
            case undefined:
            case false:
                processedArr.push( ' ' );
                break;
            case true:
                processedArr.push( '*' ); // this case is here only for extra safety, but it's not supposed to happen
                break;
            case '':
                processedArr.push( '' );
                break;

            default:
                processedArr.push( currentLetter );
                break;
        }

    }

    return processedArr.join( '' );
};

export const getWordArrayForExternalMethod = ( wordStructure: TWordStructure, newWordArray: string[] ): ReadonlyArray<string | false> => {

    const wordForExternalMethod = wordStructure.map( ( singleSlot, index ) => {

        if ( singleSlot === false ) {
            return singleSlot;
        }

        if ( newWordArray[ index ] ) {
            return newWordArray[ index ];
        } else {
            return '';
        }
    } );

    return wordForExternalMethod;
};

export const getDerivedIndex = ( smartChunkedArray: TSmartChunkedArray, rowIndex: number, indexInRow: number ): number => {
    if ( rowIndex === 0 ) {
        return indexInRow;
    }

    let previousRowsTotalCount = 0;

    for ( let rowCount = 0; rowCount < rowIndex; rowCount++ ) {
        previousRowsTotalCount = previousRowsTotalCount + smartChunkedArray[ rowCount ].length;
    }

    return previousRowsTotalCount + indexInRow;
};

export const QuizInput = ( props: TIndividualCharsInput ) => {

    const mergedProps = {
        ...DEFAULT_PROPS,
        ...props
    } as TIndividualCharsInput;

    const {
        wordStructure,
        autoFocus,
        maxBoxesPerLine,
        lineBreakOnSpace,
        borderColor,
        backgroundColor,
        textColor,
        size,
        inputStyle,
        onChange: externalOnChange
    } = mergedProps;
    const inputsRef = useRef( [] as any );
    const [ activeLetter, setActiveLetter ] = useState( 0 );

    const [ inputContentArray, setInputContentArray ] = useState( transformWordStructureToTemplateArray( wordStructure ) as string [] );

    useEffect( () => {
        inputsRef.current = inputsRef.current.slice( 0, wordStructure.length );
    }, [ wordStructure ] );

    useEffect( () => {
        if ( autoFocus ) {
            inputsRef?.current?.[0]?.focus();
        }
    }, [ autoFocus ] );

    useEffect( () => {
        inputsRef?.current?.[activeLetter]?.clear();
        inputsRef?.current?.[activeLetter]?.focus();
    }, [ activeLetter ] );

    useEffect( () => {
        const callbackData = {
            wordArray: inputContentArray,
            wordString: getWordStringForExternalMethod( inputContentArray )
        } as TCallbackData;

        externalOnChange( callbackData  );

    }, [ inputContentArray, externalOnChange ] );

    const sizeRelatedProps = getSizeRelatedProps( size! );

    const individualCharsInputStyles = StyleSheet.create( {
        // this is the View wrapping all Scrollviews
        inputsWrapper: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around'
        },
        // this is the ScrollView wrapper
        scrollViewWrapper: {
            flexGrow: 0
        },
        // this is the ScrollView content
        inputWrapper: {
            display: 'flex',
            flexDirection: 'row',
            marginBottom: 10,
            justifyContent: 'center'
        },
        singleInput: {
            ...sizeRelatedProps,
            backgroundColor,
            color: textColor,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
            borderTopWidth: 1,
            borderTopColor: borderColor,
            borderLeftWidth: 1,
            borderLeftColor: borderColor,
            borderRightWidth: 1,
            borderRightColor: borderColor,
            marginRight: 1,
            textAlign: 'center',
            paddingTop: 0,
            paddingBottom: 0,
            ...inputStyle
        },
        spacer: {
            width: 20
        }
    } );

    const onTextChange = ( letter: string, index: number ) => {
        const newInputContent = [ ...inputContentArray ];
        newInputContent.splice( index, 1, letter );
        setInputContentArray( newInputContent );
    };

    const onLetterChange = ( event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number ) => {

        const { nativeEvent } = event;

        if ( nativeEvent.key === 'Backspace' ) {

            if ( !inputContentArray[ index ] ) {
                const prevIndex = getPreviousValidIndex( wordStructure, index );
                setActiveLetter( prevIndex );
                onTextChange( '', prevIndex );
            } else {
                onTextChange( '', index );
            }

        } else {
            const nextIndex = getNextValidIndex( wordStructure, index );
            setActiveLetter( nextIndex );
        }
    };

    const wordStructureRows = getSmartChunkedArray( wordStructure, lineBreakOnSpace!, maxBoxesPerLine! );

    return (
        <View style={ individualCharsInputStyles.inputsWrapper as any }>
            { wordStructureRows.map( ( singleRow, rowIndex ) => {
                return (
                    <ScrollView style={ individualCharsInputStyles.scrollViewWrapper } keyboardShouldPersistTaps='never' key={ rowIndex } contentContainerStyle={ individualCharsInputStyles.inputWrapper as any }>

                        { singleRow.map( ( singleInput, indexInRow ) => {

                            const derivedIndex = getDerivedIndex( wordStructureRows, rowIndex, indexInRow );

                            if ( singleInput ) {
                                return (
                                    <TextInput
                                        key={ derivedIndex.toString() }
                                        ref={ ( el ) =>  { inputsRef.current[ derivedIndex ] = el; } }
                                        style={ individualCharsInputStyles.singleInput as any }
                                        maxLength={ 1 }
                                        onKeyPress={ ( event ) => onLetterChange( event, derivedIndex ) }
                                        onChangeText={ ( letter ) => onTextChange( letter, derivedIndex ) }
                                        autoCorrect={ false }
                                        autoCompleteType={ 'off' }
                                        autoCapitalize={ 'characters' }
                                    />
                                );
                            } else {
                                return (
                                    <View key={ derivedIndex.toString() } style={ individualCharsInputStyles.spacer } />
                                );
                            }
                        } ) }
                    </ScrollView>
                );
            } ) }
        </View>
    );

};

export default NativeModules.RNQuizInputModule;
